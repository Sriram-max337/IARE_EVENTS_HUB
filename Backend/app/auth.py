from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.schemas import CurrentUser, Role
from app.tables import users


def _clean_bearer_token(value: str | None) -> str | None:
    if not value:
        return None
    scheme, _, token = value.partition(" ")
    return token if scheme.lower() == "bearer" and token else None


def _decode_identity(token: str) -> dict:
    settings = get_settings()
    try:
        if settings.supabase_jwt_secret:
            options = {"verify_aud": bool(settings.jwt_audience)}
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience=settings.jwt_audience,
                options=options,
            )
        return jwt.get_unverified_claims(token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"message": "invalid token"}) from exc


async def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
    x_roll_no: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> CurrentUser:
    token = _clean_bearer_token(authorization)
    claims = _decode_identity(token) if token else {}

    user_id = x_user_id or claims.get("user_id") or claims.get("sub") or claims.get("id")
    roll_no = x_roll_no or claims.get("roll_no") or claims.get("rollNo") or claims.get("email")

    filters = []
    if user_id:
        try:
            filters.append(users.c.id == UUID(str(user_id)))
        except ValueError:
            pass
    if roll_no:
        filters.append(users.c.roll_no == str(roll_no))

    if not filters:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"message": "missing identity"})

    result = await session.execute(select(users).where(or_(*filters)).limit(1))
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"message": "user not found"})
    return CurrentUser.from_row(row)


def require_role(*roles: Role | str) -> Callable:
    allowed = {Role(role) for role in roles}

    async def dependency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": "forbidden"})
        return current_user

    return dependency
