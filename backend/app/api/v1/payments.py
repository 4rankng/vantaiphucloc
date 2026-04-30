"""Payment API for recording client payments."""

import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.base import User
from app.models.domain import Client
from app.models.payment import Payment
from app.schemas.base import PaginatedResponse
from app.schemas.domain import (
    PaymentCreate,
    PaymentUpdate,
    PaymentOut,
)
from app.core.deps import require_roles

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


async def _load_payment_out(db: AsyncSession, payment: Payment) -> PaymentOut:
    """Load a payment with client info."""
    client_result = await db.execute(select(Client).where(Client.id == payment.client_id))
    client = client_result.scalar_one_or_none()

    return PaymentOut(
        id=payment.id,
        client_id=payment.client_id,
        client_name=client.name if client else "Unknown",
        amount=payment.amount,
        payment_method=payment.payment_method,
        reference=payment.reference,
        created_at=payment.created_at,
        created_by_id=payment.created_by_id,
        created_by_name=None,  # Can be loaded if needed
    )


@router.post("/payments", response_model=PaymentOut, status_code=201)
async def create_payment(
    body: PaymentCreate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Record a payment and reduce client's outstanding debt."""
    # Load client
    client_result = await db.execute(select(Client).where(Client.id == body.client_id))
    client = client_result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check if payment amount exceeds outstanding debt (optional warning)
    if body.amount > client.outstanding_debt:
        _logger.warning(
            "PAYMENT_EXCEEDS_DEBT",
            f"Payment amount ({body.amount}) exceeds client debt ({client.outstanding_debt})",
            "payments",
        )

    # Create payment record
    payment = Payment(
        client_id=body.client_id,
        amount=body.amount,
        payment_method=body.payment_method,
        reference=body.reference,
        created_by_id=current_user.id,
    )
    db.add(payment)

    # Reduce client debt
    client.outstanding_debt -= body.amount

    await db.commit()
    await db.refresh(payment)

    _logger.info(
        "PAYMENT_CREATED",
        f"Payment #{payment.id}: {body.amount} from client {client.name}, remaining debt: {client.outstanding_debt}",
        "payments",
    )

    return await _load_payment_out(db, payment)


@router.get("/payments", response_model=PaginatedResponse[PaymentOut])
async def list_payments(
    client_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    page_size: int = 50,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """List payments with optional filters."""
    query = select(Payment).order_by(Payment.created_at.desc())
    count_query = select(func.count(Payment.id))

    if client_id is not None:
        query = query.where(Payment.client_id == client_id)
        count_query = count_query.where(Payment.client_id == client_id)

    if date_from is not None:
        query = query.where(Payment.created_at >= date_from)
        count_query = count_query.where(Payment.created_at >= date_from)

    if date_to is not None:
        query = query.where(Payment.created_at <= date_to)
        count_query = count_query.where(Payment.created_at <= date_to)

    # Get total count
    total_q = await db.execute(count_query)
    total = total_q.scalar() or 0

    # Get paginated results
    result = await db.execute(
        query.offset((page - 1) * page_size).limit(page_size)
    )
    payments = result.scalars().all()

    # Load client info for each payment
    items = [await _load_payment_out(db, p) for p in payments]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total > 0 else 0,
    )


@router.get("/payments/{payment_id}", response_model=PaymentOut)
async def get_payment(
    payment_id: int,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Get a single payment by ID."""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    return await _load_payment_out(db, payment)
