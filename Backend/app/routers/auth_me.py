from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.schemas import CurrentUser, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser = Depends(get_current_user)):
    return UserOut(**current_user.model_dump())
