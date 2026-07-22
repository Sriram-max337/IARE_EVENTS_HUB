import csv
from io import StringIO
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import Select, func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_event_club, require_role
from app.db import get_session
from app.schemas import (
    AttendanceRowOut,
    CheckInIn,
    CheckInOut,
    CurrentUser,
    DeptStatsBucket,
    EventCapacityOut,
    EventIn,
    EventManagerOut,
    EventOut,
    EventPatch,
    EventStatus,
    RegistrationOut,
    Role,
    StatsOut,
    YearStatsBucket,
)
from app.tables import events, registrations, users

router = APIRouter(prefix="/events", tags=["events"])


def _event_out(row) -> EventOut:
    return EventOut(**dict(row._mapping if hasattr(row, "_mapping") else row))


def _event_manager_out(row) -> EventManagerOut:
    return EventManagerOut(**dict(row._mapping if hasattr(row, "_mapping") else row))


def _registration_out(row) -> RegistrationOut:
    return RegistrationOut(**dict(row._mapping if hasattr(row, "_mapping") else row))


def _attendance_row_out(row) -> AttendanceRowOut:
    return AttendanceRowOut(
        student_name=row.student_name,
        roll_no=row.roll_no,
        dept=row.dept,
        attended=row.attended,
        checked_in_at=row.checked_in_at,
    )


async def _get_event_row(session: AsyncSession, event_id: int):
    result = await session.execute(select(events).where(events.c.id == event_id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "event not found"})
    return row


@router.post("", response_model=EventManagerOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventIn,
    current_user: CurrentUser = Depends(require_role(Role.event_manager)),
    session: AsyncSession = Depends(get_session),
):
    if not current_user.managed_club_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "event manager has no managed club"},
        )

    values = payload.model_dump(exclude={"club_id", "date", "time"}, exclude_none=True)
    values["club_id"] = current_user.managed_club_id
    values["created_by"] = current_user.id
    values["status"] = EventStatus.live

    result = await session.execute(insert(events).values(**values).returning(events))
    await session.commit()
    return _event_manager_out(result.first())


@router.get("", response_model=list[EventOut])
async def list_events(
    club_id: int | None = Query(default=None),
    status_filter: EventStatus | None = Query(default=None, alias="status"),
    _: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query: Select = select(events).order_by(events.c.event_date.asc())
    if club_id:
        query = query.where(events.c.club_id == club_id)
    if status_filter:
        query = query.where(events.c.status == status_filter)
    result = await session.execute(query)
    return [_event_out(row) for row in result.fetchall()]


@router.get("/{event_id}", response_model=EventOut)
async def get_event(
    event_id: int,
    _: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return _event_out(await _get_event_row(session, event_id))


@router.get("/{event_id}/capacity", response_model=EventCapacityOut)
async def event_capacity(
    event_id: int,
    _: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _get_event_row(session, event_id)
    result = await session.execute(
        select(registrations.c.status, func.count().label("status_count"))
        .where(
            registrations.c.event_id == event_id,
            registrations.c.status.in_(["confirmed", "waitlisted"]),
        )
        .group_by(registrations.c.status)
    )
    counts = {row.status: row.status_count for row in result.fetchall()}
    confirmed_count = counts.get("confirmed", 0)
    waitlisted_count = counts.get("waitlisted", 0)
    return EventCapacityOut(
        event_id=event_id,
        confirmed_count=confirmed_count,
        waitlisted_count=waitlisted_count,
        active_count=confirmed_count + waitlisted_count,
    )


@router.get("/{event_id}/registrations", response_model=list[RegistrationOut])
async def event_registrations(
    event_id: int,
    _: CurrentUser = Depends(require_event_club("event_id")),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(registrations)
        .where(
            registrations.c.event_id == event_id,
            registrations.c.status.in_(["confirmed", "waitlisted"]),
        )
        .order_by(registrations.c.registered_at.asc())
    )
    return [_registration_out(row) for row in result.fetchall()]


@router.post("/{event_id}/checkin", response_model=CheckInOut)
async def check_in_registration(
    event_id: int,
    payload: CheckInIn,
    _: CurrentUser = Depends(require_event_club("event_id")),
    session: AsyncSession = Depends(get_session, use_cache=False),
):
    try:
        qr_token = UUID(payload.qr_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "registration not found"},
        ) from exc

    async with session.begin():
        reg_result = await session.execute(
            select(registrations)
            .where(registrations.c.qr_token == qr_token)
            .with_for_update()
        )
        reg_row = reg_result.first()
        if not reg_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "registration not found"},
            )
        if reg_row.event_id != event_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "qr token belongs to another event"},
            )
        if reg_row.status != "confirmed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "registration is not confirmed"},
            )
        if reg_row.attended:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"message": "already checked in"},
            )

        update_result = await session.execute(
            update(registrations)
            .where(registrations.c.id == reg_row.id)
            .values(attended=True, checked_in_at=func.now())
            .returning(registrations.c.student_id, registrations.c.checked_in_at)
        )
        updated_row = update_result.first()

        student_result = await session.execute(
            select(users.c.name, users.c.roll_no).where(users.c.id == updated_row.student_id)
        )
        student_row = student_result.first()
        if not student_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "student not found"},
            )

        return CheckInOut(
            student_name=student_row.name,
            roll_no=student_row.roll_no,
            checked_in_at=updated_row.checked_in_at,
        )


@router.get("/{event_id}/attendance", response_model=list[AttendanceRowOut])
async def event_attendance(
    event_id: int,
    _: CurrentUser = Depends(require_event_club("event_id")),
    session: AsyncSession = Depends(get_session),
):
    await _get_event_row(session, event_id)
    result = await session.execute(
        select(
            users.c.name.label("student_name"),
            users.c.roll_no,
            users.c.dept,
            registrations.c.attended,
            registrations.c.checked_in_at,
        )
        .select_from(registrations.join(users, registrations.c.student_id == users.c.id))
        .where(
            registrations.c.event_id == event_id,
            registrations.c.status == "confirmed",
        )
        .order_by(users.c.roll_no.asc())
    )
    return [_attendance_row_out(row) for row in result.fetchall()]


@router.get("/{event_id}/attendance/export")
async def export_event_attendance(
    event_id: int,
    _: CurrentUser = Depends(require_event_club("event_id")),
    session: AsyncSession = Depends(get_session),
):
    event_row = await _get_event_row(session, event_id)
    result = await session.execute(
        select(
            users.c.name.label("student_name"),
            users.c.roll_no,
            users.c.dept,
            registrations.c.attended,
            registrations.c.checked_in_at,
        )
        .select_from(registrations.join(users, registrations.c.student_id == users.c.id))
        .where(
            registrations.c.event_id == event_id,
            registrations.c.status == "confirmed",
        )
        .order_by(users.c.roll_no.asc())
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "roll_no", "dept", "attended", "checked_in_at"])
    for row in result.fetchall():
        writer.writerow(
            [
                row.student_name,
                row.roll_no,
                row.dept or "",
                "true" if row.attended else "false",
                row.checked_in_at.isoformat() if row.checked_in_at else "",
            ]
        )
    output.seek(0)

    filename = f"event-{event_row.id}-attendance.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch("/{event_id}", response_model=EventManagerOut)
async def patch_event(
    event_id: int,
    payload: EventPatch,
    current_user: CurrentUser = Depends(require_event_club("event_id")),
    session: AsyncSession = Depends(get_session),
):
    event_row = await _get_event_row(session, event_id)

    exclude = {"date", "time"}
    if current_user.role != Role.main_admin:
        exclude.add("club_id")
    values = payload.model_dump(exclude=exclude, exclude_unset=True, exclude_none=True)
    if not values:
        return _event_manager_out(event_row)

    if "capacity" in values:
        confirmed_result = await session.execute(
            select(func.count())
            .select_from(registrations)
            .where(
                registrations.c.event_id == event_id,
                registrations.c.status == "confirmed",
            )
        )
        confirmed_count = confirmed_result.scalar_one()
        if values["capacity"] < confirmed_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "capacity cannot be lower than confirmed registrations"},
            )

    result = await session.execute(
        update(events).where(events.c.id == event_id).values(**values).returning(events)
    )
    await session.commit()
    return _event_manager_out(result.first())


@router.delete("/{event_id}", response_model=EventManagerOut)
async def cancel_event(
    event_id: int,
    _: CurrentUser = Depends(require_event_club("event_id")),
    session: AsyncSession = Depends(get_session),
):
    event_row = await _get_event_row(session, event_id)
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
    event_id: int,
    _: CurrentUser = Depends(require_event_club("event_id")),
    session: AsyncSession = Depends(get_session),
):
    await _get_event_row(session, event_id)

    total_result = await session.execute(
        select(registrations.c.status, func.count().label("status_count"))
        .select_from(registrations)
        .where(
            registrations.c.event_id == event_id,
            registrations.c.status.in_(["confirmed", "waitlisted"]),
        )
        .group_by(registrations.c.status)
    )
    attendance_result = await session.execute(
        select(func.count())
        .select_from(registrations)
        .where(
            registrations.c.event_id == event_id,
            registrations.c.status == "confirmed",
            registrations.c.attended.is_(True),
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

    status_counts = {row.status: row.status_count for row in total_result.fetchall()}
    total_confirmed = status_counts.get("confirmed", 0)
    total_waitlisted = status_counts.get("waitlisted", 0)
    total_attended = attendance_result.scalar_one()

    return StatsOut(
        total_confirmed=total_confirmed,
        total_waitlisted=total_waitlisted,
        dept_breakdown=[
            DeptStatsBucket(dept=row.student_dept_snapshot, count=row.confirmed_count)
            for row in dept_result.fetchall()
        ],
        year_breakdown=[
            YearStatsBucket(year=row.student_year_snapshot, count=row.confirmed_count)
            for row in year_result.fetchall()
        ],
        total_attended=total_attended,
        attendance_rate=round(total_attended / total_confirmed, 4) if total_confirmed else 0,
    )
