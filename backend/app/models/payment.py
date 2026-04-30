"""Payment model for recording client payments to reduce outstanding debt."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import _utcnow


class Payment(Base):
    """Payment records for tracking client debt payments."""

    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # VND
    payment_method = Column(String(50), nullable=True)  # CASH, BANK_TRANSFER, etc.
    reference = Column(String(255), nullable=True)  # Reference number or note
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    client = relationship("Client", backref="payments")
    created_by = relationship("User", backref="created_payments")
