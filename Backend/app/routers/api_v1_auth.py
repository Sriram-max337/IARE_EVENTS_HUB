from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.auth import create_access_token, get_current_user
from app.db import get_session
from app.schemas import CurrentUser, LoginIn, LoginOut, SamvidhaProfileOut, UserOut
from app.services.samvidha import SamvidhaAuthError, SamvidhaClient, SamvidhaPortalError, SamvidhaProfile
from app.tables import depts, users

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

BRANCH_CODE_ALIASES = {
    "AERONAUTICAL ENGINEERING": "AERO",
    "AEROSPACE ENGINEERING": "AERO",
    "CIVIL ENGINEERING": "CIVIL",
    "COMPUTER SCIENCE": "CSE",
    "COMPUTER SCIENCE AND ENGINEERING": "CSE",
    "COMPUTER SCIENCE & ENGINEERING": "CSE",
    "ELECTRICAL AND ELECTRONICS ENGINEERING": "EEE",
    "ELECTRICAL & ELECTRONICS ENGINEERING": "EEE",
    "ELECTRONICS AND COMMUNICATION ENGINEERING": "ECE",
    "ELECTRONICS & COMMUNICATION ENGINEERING": "ECE",
    "MECHANICAL ENGINEERING": "MECH",
}


def _normalize_branch(value: str) -> str:
    return " ".join(value.replace(".", " ").replace("-", " ").split()).upper()


async def _resolve_dept_id(session: AsyncSession, branch: str) -> UUID:
    normalized = _normalize_branch(branch)
    candidates = {normalized, BRANCH_CODE_ALIASES.get(normalized, normalized)}

    result = await session.execute(
        select(depts).where(
            or_(
                func.upper(depts.c.code).in_(candidates),
                func.upper(depts.c.name).in_(candidates),
            )
        )
    )
    row = result.first()
    if row:
        return row.id

    result = await session.execute(select(depts))
    for row in result.fetchall():
        dept_name = _normalize_branch(row.name)
        dept_code = _normalize_branch(row.code)
        if dept_code in normalized or normalized in dept_name or dept_name in normalized:
            return row.id

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"message": "department not configured"},
    )


async def _upsert_user_from_profile(session: AsyncSession, profile: SamvidhaProfile) -> UserOut:
    dept_id = await _resolve_dept_id(session, profile.branch)
    statement = pg_insert(users).values(
        roll_no=profile.roll_no,
        name=profile.name,
        dept_id=dept_id,
        year=profile.year,
        role="student",
    )
    statement = statement.on_conflict_do_update(
        index_elements=[users.c.roll_no],
        set_={
            "name": statement.excluded.name,
            "dept_id": statement.excluded.dept_id,
            "year": statement.excluded.year,
        },
    ).returning(users)
    result = await session.execute(statement)
    await session.commit()
    return UserOut(**dict(result.first()._mapping))


@router.post("/login", response_model=LoginOut)
async def login(payload: LoginIn, session: AsyncSession = Depends(get_session)):
    try:
        profile = await run_in_threadpool(SamvidhaClient().authenticate, payload.roll_no, payload.password)
    except SamvidhaAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "invalid Samvidha credentials"},
        ) from exc
    except SamvidhaPortalError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"message": "could not verify Samvidha credentials"},
        ) from exc

    user = await _upsert_user_from_profile(session, profile)
    token = create_access_token(user_id=user.id, roll_no=user.roll_no, role=user.role)

    return LoginOut(
        access_token=token,
        user=user,
        profile=SamvidhaProfileOut(
            name=profile.name,
            roll_no=profile.roll_no,
            branch=profile.branch,
            year=profile.year,
            section=profile.section,
        ),
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser = Depends(get_current_user)):
    return UserOut(**current_user.model_dump())
