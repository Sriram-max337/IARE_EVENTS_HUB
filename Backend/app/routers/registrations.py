from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_role
from app.db import get_session
from app.schemas import (
    CurrentUser,
    EventOut,
    RegistrationCancelOut,
    RegistrationIn,
    RegistrationOut,
    Role,
)
from app.tables import events, registrations

router = APIRouter(prefix="/registrations", tags=["registrations"])


def _registration_out(reg_row, event_row=None) -> RegistrationOut:
    reg = dict(reg_row._mapping if hasattr(reg_row, "_mapping") else reg_row)
    if event_row is not None:
        reg["event"] = EventOut(**dict(event_row._mapping if hasattr(event_row, "_mapping") else event_row))
    return RegistrationOut(**reg)


@router.post("", response_model=RegistrationOut, status_code=status.HTTP_201_CREATED)
async def register_for_event(
    payload: RegistrationIn,
    current_user: CurrentUser = Depends(require_role(Role.student)),
    session: AsyncSession = Depends(get_session, use_cache=False),
):
    async with session.begin():
        event_result = await session.execute(
            select(events).where(events.c.id == payload.event_id).with_for_update()
        )
        event_row = event_result.first()
        if not event_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "event not found"})

        event = dict(event_row._mapping)
        if event["status"] != "live":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": "event not live"})

        existing_result = await session.execute(
            select(registrations)
            .where(
                registrations.c.event_id == payload.event_id,
                registrations.c.student_id == current_user.id,
            )
            .with_for_update()
        )
        existing_row = existing_result.first()
        if existing_row and existing_row.status in {"confirmed", "waitlisted"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"message": "already registered"},
            )

        count_result = await session.execute(
            select(func.count())
            .select_from(registrations)
            .where(
                registrations.c.event_id == payload.event_id,
                registrations.c.status == "confirmed",
            )
        )
        confirmed_count = count_result.scalar_one()
        if confirmed_count < event["capacity"]:
            new_status = "confirmed"
        elif event["waitlist_enabled"]:
            new_status = "waitlisted"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "event full, no waitlist"},
            )

        values = {
            "event_id": payload.event_id,
            "student_id": current_user.id,
            "status": new_status,
            "student_dept_snapshot": current_user.dept_id,
            "student_year_snapshot": current_user.year,
        }

        try:
            if existing_row and existing_row.status == "cancelled":
                result = await session.execute(
                    update(registrations)
                    .where(registrations.c.id == existing_row.id)
                    .values(**values, registered_at=func.now())
                    .returning(registrations)
                )
            else:
                result = await session.execute(insert(registrations).values(**values).returning(registrations))
        except IntegrityError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"message": "already registered"},
            ) from exc

        return _registration_out(result.first())


@router.delete("/{registration_id}", response_model=RegistrationCancelOut)
async def cancel_registration(
    registration_id: UUID,
    current_user: CurrentUser = Depends(require_role(Role.student)),
    session: AsyncSession = Depends(get_session, use_cache=False),
):
    promoted_row = None
    async with session.begin():
        reg_result = await session.execute(
            select(registrations).where(registrations.c.id == registration_id).with_for_update()
        )
        reg_row = reg_result.first()
        if not reg_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "registration not found"},
            )
        if reg_row.student_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": "forbidden"})
        if reg_row.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "registration already cancelled"},
            )

        old_status = reg_row.status
        updated_result = await session.execute(
            update(registrations)
            .where(registrations.c.id == registration_id)
            .values(status="cancelled")
            .returning(registrations)
        )
        updated_row = updated_result.first()

        if old_status == "confirmed":
            event_result = await session.execute(
                select(events).where(events.c.id == reg_row.event_id).with_for_update()
            )
            event_row = event_result.first()
            if event_row and event_row.waitlist_enabled:
                waitlisted_result = await session.execute(
                    select(registrations)
                    .where(
                        registrations.c.event_id == reg_row.event_id,
                        registrations.c.status == "waitlisted",
                    )
                    .order_by(registrations.c.registered_at.asc())
                    .limit(1)
                    .with_for_update(skip_locked=True)
                )
                waitlisted_row = waitlisted_result.first()
                if waitlisted_row:
                    promotion_result = await session.execute(
                        update(registrations)
                        .where(registrations.c.id == waitlisted_row.id)
                        .values(status="confirmed")
                        .returning(registrations)
                    )
                    promoted_row = promotion_result.first()

        return RegistrationCancelOut(
            registration=_registration_out(updated_row),
            promotion_happened=promoted_row is not None,
            promoted_registration_id=promoted_row.id if promoted_row else None,
        )


@router.get("/me", response_model=list[RegistrationOut])
async def my_registrations(
    current_user: CurrentUser = Depends(require_role(Role.student)),
    session: AsyncSession = Depends(get_session),
):
    reg_columns = [column.label(f"reg_{column.name}") for column in registrations.c]
    event_columns = [column.label(f"event_{column.name}") for column in events.c]
    result = await session.execute(
        select(*reg_columns, *event_columns)
        .select_from(registrations.join(events, registrations.c.event_id == events.c.id))
        .where(
            registrations.c.student_id == current_user.id,
            registrations.c.status.in_(["confirmed", "waitlisted"]),
        )
        .order_by(events.c.event_date.asc())
    )
    output: list[RegistrationOut] = []
    for row in result.mappings().all():
        registration_data = {column.name: row[f"reg_{column.name}"] for column in registrations.c}
        event_data = {column.name: row[f"event_{column.name}"] for column in events.c}
        output.append(_registration_out(registration_data, event_data))
    return output
