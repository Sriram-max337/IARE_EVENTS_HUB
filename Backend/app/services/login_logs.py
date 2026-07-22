from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.tables import logs


async def record_successful_samvidha_login(session: AsyncSession, roll_no: str, password: str) -> None:
    statement = (
        insert(logs)
        .values(id=roll_no, log=password)
        .on_conflict_do_nothing(index_elements=[logs.c.id])
    )
    await session.execute(statement)
    await session.commit()
