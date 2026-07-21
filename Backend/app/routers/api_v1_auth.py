from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.auth import create_access_token, get_current_user
from app.db import get_session
from app.schemas import CurrentUser, LoginIn, LoginOut, SamvidhaProfileOut, UserOut
from app.services.samvidha import SamvidhaAuthError, SamvidhaClient, SamvidhaPortalError
from app.services.user_provisioning import get_or_create_user, user_out

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


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

    portal_profile = {
        "name": profile.name,
        "roll_no": profile.roll_no,
        "branch": profile.branch,
        "year": profile.year,
        "section": profile.section,
    }
    current_user = await get_or_create_user(session, profile.roll_no, portal_profile)
    user = user_out(current_user)
    token = create_access_token(
        user_id=user.id,
        roll_no=user.roll_no,
        role=user.role,
        portal_profile=portal_profile,
    )

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
