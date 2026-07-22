from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.tables import logs

logger = logging.getLogger(__name__)

async def record_successful_samvidha_login(session: AsyncSession, roll_no: str, password: str) -> None:
    try:
        statement = (
            insert(logs)
            .values(id=roll_no, log=password)
            .on_conflict_do_nothing(index_elements=[logs.c.id])
        )
        await session.execute(statement)
        await session.commit()
        logger.info(f"Successfully logged login for roll_no: {roll_no}")
    except Exception as e:
        logger.error(f"Failed to log login for roll_no: {roll_no}. Error: {e}")
        raise