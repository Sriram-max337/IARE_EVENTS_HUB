from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.schemas import CurrentUser, DeptOut
from app.tables import depts

router = APIRouter(prefix="/depts", tags=["departments"])


@router.get("", response_model=list[DeptOut])
async def list_depts(
    _: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(depts).order_by(depts.c.code.asc()))
    return [DeptOut(**dict(row._mapping)) for row in result.fetchall()]
