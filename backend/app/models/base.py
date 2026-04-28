from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Index
from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    """
    Application user / system account.

    Valid roles:
        superadmin  – full system access
        director    – read-only dashboards and reports
        accountant  – manages trips, pricing, reconciliation, salary
        driver      – submits work orders
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Login credentials — any of phone, email, or username can be used to log in
    phone = Column(String(20), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, nullable=True, index=True)

    # Display name / full name (also usable as login identifier)
    username = Column(String(100), nullable=False, index=True)

    hashed_password = Column(String(255), nullable=False)

    # superadmin | director | accountant | driver
    role = Column(String(20), default="driver", nullable=False)

    # Multi-tenancy: every user belongs to a company
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)

    is_active = Column(Boolean, default=True, nullable=False)

    # Optional: tractor plate for drivers
    tractor_plate = Column(String(20), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=_utcnow,
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        nullable=False,
    )

    __table_args__ = (
        Index("ix_users_company_id_role", "company_id", "role"),
    )
