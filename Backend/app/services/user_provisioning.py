from dataclasses import asdict, is_dataclass
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas import CurrentUser, UserOut
from app.tables import users


def _profile_to_dict(portal_profile: Any) -> dict[str, Any]:
    if is_dataclass(portal_profile):
        return asdict(portal_profile)
    if hasattr(portal_profile, "model_dump"):
        return portal_profile.model_dump()
    return dict(portal_profile or {})


def _parse_year(value: Any) -> int:
    if isinstance(value, int):
        year = value
    else:
        token = str(value).strip().split()[0].upper().rstrip(".,")
        roman_years = {"I": 1, "II": 2, "III": 3, "IV": 4}
        if token in roman_years:
            year = roman_years[token]
        else:
            digits = "".join(char for char in token if char.isdigit())
            if not digits:
                raise ValueError("missing year")
            year = int(digits)
    if year < 1 or year > 4:
        raise ValueError("year out of range")
    return year


def _profile_dept(profile: dict[str, Any]) -> str | None:
    value = profile.get("dept") or profile.get("branch")
    return str(value).strip() if value else None


async def get_or_create_user(
    session: AsyncSession,
    roll_no: str,
    portal_profile: dict[str, Any] | Any,
) -> CurrentUser:
    profile = _profile_to_dict(portal_profile)
    profile_year = _parse_year(profile["year"])

    result = await session.execute(select(users).where(users.c.roll_no == roll_no).limit(1))
    row = result.first()

    if row:
        if row.year != profile_year:
            result = await session.execute(
                update(users)
                .where(users.c.id == row.id)
                .values(year=profile_year)
                .returning(users)
            )
            await session.commit()
            row = result.first()
        return CurrentUser.from_row(row)

    values = {
        "roll_no": roll_no,
        "name": profile["name"],
        "dept": _profile_dept(profile),
        "year": profile_year,
        "role": "student",
    }
    result = await session.execute(users.insert().values(**values).returning(users))
    await session.commit()
    return CurrentUser.from_row(result.first())


def user_out(user: CurrentUser) -> UserOut:
    return UserOut(**user.model_dump())
