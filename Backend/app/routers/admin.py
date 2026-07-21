from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_role
from app.db import get_session
from app.schemas import CurrentUser, EventManagerOut, ManagerAssignIn, Role, UserOut
from app.tables import clubs, events, users

router = APIRouter(prefix="/admin", tags=["admin"])


def _user_out(row) -> UserOut:
    return UserOut(**dict(row._mapping if hasattr(row, "_mapping") else row))


def _event_manager_out(row) -> EventManagerOut:
    return EventManagerOut(**dict(row._mapping if hasattr(row, "_mapping") else row))


@router.get("/managers", response_model=list[UserOut])
async def list_managers(
    _: CurrentUser = Depends(require_role(Role.main_admin)),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(users).where(users.c.role == Role.event_manager).order_by(users.c.name.asc())
    )
    return [_user_out(row) for row in result.fetchall()]


@router.get("/users", response_model=list[UserOut])
async def list_users(
    _: CurrentUser = Depends(require_role(Role.main_admin)),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(users).order_by(users.c.name.asc()))
    return [_user_out(row) for row in result.fetchall()]


@router.post("/managers", response_model=UserOut)
async def assign_manager(
    payload: ManagerAssignIn,
    _: CurrentUser = Depends(require_role(Role.main_admin)),
    session: AsyncSession = Depends(get_session),
):
    club_result = await session.execute(select(clubs.c.id).where(clubs.c.id == payload.club_id))
    if not club_result.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "club not found"})

    result = await session.execute(
        update(users)
        .where(users.c.id == payload.user_id)
        .values(role=Role.event_manager, managed_club_id=payload.club_id)
        .returning(users)
    )
    row = result.first()
    if not row:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "user not found"})
    await session.commit()
    return _user_out(row)


@router.delete("/managers/{manager_id}", response_model=UserOut)
async def remove_manager(
    manager_id: int,
    _: CurrentUser = Depends(require_role(Role.main_admin)),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        update(users)
        .where(users.c.id == manager_id, users.c.role == Role.event_manager)
        .values(role=Role.student, managed_club_id=None)
        .returning(users)
    )
    row = result.first()
    if not row:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "manager not found"})
    await session.commit()
    return _user_out(row)


@router.get("/events", response_model=list[EventManagerOut])
async def list_all_events(
    _: CurrentUser = Depends(require_role(Role.main_admin)),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(events).order_by(events.c.event_date.asc()))
    return [_event_manager_out(row) for row in result.fetchall()]
