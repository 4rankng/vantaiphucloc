"""
Pricing lookup service.

Used by work order creation to auto-fill unit_price, driver_salary,
allowance, and earning from a matching Pricing record.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.domain import Pricing


async def find_pricing(
    db: AsyncSession,
    company_id: int,
    client_id: int,
    work_type: str,
    route: str,
) -> Pricing | None:
    """
    Look up a Pricing record matching all four keys.

    Returns the first match or None if no pricing rule exists.
    """
    result = await db.execute(
        select(Pricing).where(
            Pricing.company_id == company_id,
            Pricing.client_id == client_id,
            Pricing.work_type == work_type,
            Pricing.route == route,
        ).limit(1)
    )
    return result.scalar_one_or_none()
