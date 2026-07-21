from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.schemas import ClubOut, CurrentUser
from app.tables import clubs

router = APIRouter(tags=["clubs"])


@router.get("/clubs", response_model=list[ClubOut])
@router.get("/depts", response_model=list[ClubOut], include_in_schema=False)
async def list_clubs(
    _: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(clubs).order_by(clubs.c.code.asc()))
    return [ClubOut(**dict(row._mapping)) for row in result.fetchall()]
