from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_role
from app.db import get_session
from app.schemas import (
    CurrentUser,
    DeptStatsBucket,
    EventIn,
    EventManagerOut,
    EventOut,
    EventPatch,
    EventStatus,
    Role,
    StatsOut,
    YearStatsBucket,
)
from app.tables import events, registrations

router = APIRouter(prefix="/events", tags=["events"])


def _event_out(row) -> EventOut:
    return EventOut(**dict(row._mapping if hasattr(row, "_mapping") else row))


def _event_manager_out(row) -> EventManagerOut:
    return EventManagerOut(**dict(row._mapping if hasattr(row, "_mapping") else row))


async def _get_event_row(session: AsyncSession, event_id: UUID):
    result = await session.execute(select(events).where(events.c.id == event_id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "event not found"})
    return row


def _ensure_event_admin_or_owner(current_user: CurrentUser, event_row) -> None:
    event = dict(event_row._mapping)
    if current_user.role == Role.main_admin:
        return
    if current_user.role == Role.event_manager and event["dept_id"] == current_user.managed_dept_id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": "forbidden"})


@router.post("", response_model=EventManagerOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventIn,
    current_user: CurrentUser = Depends(require_role(Role.event_manager)),
    session: AsyncSession = Depends(get_session),
):
    if not current_user.managed_dept_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "event manager has no managed department"},
        )

    values = payload.model_dump(exclude={"dept_id", "date", "time"}, exclude_none=True)
    values["dept_id"] = current_user.managed_dept_id
    values["created_by"] = current_user.id
    values["status"] = EventStatus.live

    result = await session.execute(insert(events).values(**values).returning(events))
    await session.commit()
    return _event_manager_out(result.first())


@router.get("", response_model=list[EventOut])
async def list_events(
    dept_id: UUID | None = Query(default=None),
    status_filter: EventStatus | None = Query(default=None, alias="status"),
    _: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query: Select = select(events).order_by(events.c.event_date.asc())
    if dept_id:
        query = query.where(events.c.dept_id == dept_id)
    if status_filter:
        query = query.where(events.c.status == status_filter)
    result = await session.execute(query)
    return [_event_out(row) for row in result.fetchall()]


@router.get("/{event_id}", response_model=EventOut)
async def get_event(
    event_id: UUID,
    _: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return _event_out(await _get_event_row(session, event_id))


@router.patch("/{event_id}", response_model=EventManagerOut)
async def patch_event(
    event_id: UUID,
    payload: EventPatch,
    current_user: CurrentUser = Depends(require_role(Role.event_manager, Role.main_admin)),
    session: AsyncSession = Depends(get_session),
):
    event_row = await _get_event_row(session, event_id)
    _ensure_event_admin_or_owner(current_user, event_row)

    exclude = {"date", "time"}
    if current_user.role != Role.main_admin:
        exclude.add("dept_id")
    values = payload.model_dump(exclude=exclude, exclude_unset=True, exclude_none=True)
    if not values:
        return _event_manager_out(event_row)

    result = await session.execute(
        update(events).where(events.c.id == event_id).values(**values).returning(events)
    )
    await session.commit()
    return _event_manager_out(result.first())


@router.delete("/{event_id}", response_model=EventManagerOut)
async def cancel_event(
    event_id: UUID,
    current_user: CurrentUser = Depends(require_role(Role.event_manager, Role.main_admin)),
    session: AsyncSession = Depends(get_session),
):
    event_row = await _get_event_row(session, event_id)
    _ensure_event_admin_or_owner(current_user, event_row)
    result = await session.execute(
        update(events)
        .where(events.c.id == event_id)
        .values(status=EventStatus.cancelled)
        .returning(events)
    )
    await session.commit()
    return _event_manager_out(result.first())


@router.get("/{event_id}/stats", response_model=StatsOut)
async def event_stats(
    event_id: UUID,
    current_user: CurrentUser = Depends(require_role(Role.event_manager, Role.main_admin)),
    session: AsyncSession = Depends(get_session),
):
    event_row = await _get_event_row(session, event_id)
    _ensure_event_admin_or_owner(current_user, event_row)

    total_result = await session.execute(
        select(func.count())
        .select_from(registrations)
        .where(
            registrations.c.event_id == event_id,
            registrations.c.status == "confirmed",
        )
    )
    dept_result = await session.execute(
        select(registrations.c.student_dept_snapshot, func.count().label("confirmed_count"))
        .where(
            registrations.c.event_id == event_id,
            registrations.c.status == "confirmed",
        )
        .group_by(registrations.c.student_dept_snapshot)
    )
    year_result = await session.execute(
        select(registrations.c.student_year_snapshot, func.count().label("confirmed_count"))
        .where(
            registrations.c.event_id == event_id,
            registrations.c.status == "confirmed",
        )
        .group_by(registrations.c.student_year_snapshot)
    )

    return StatsOut(
        total_confirmed=total_result.scalar_one(),
        by_dept=[
            DeptStatsBucket(dept_id=row.student_dept_snapshot, count=row.confirmed_count)
            for row in dept_result.fetchall()
        ],
        by_year=[
            YearStatsBucket(year=row.student_year_snapshot, count=row.confirmed_count)
            for row in year_result.fetchall()
        ],
    )
