from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Index
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
        driver      – submits work orders (internal or vendor)

    This app belongs to Phúc Lộc. Internal staff (superadmin, director, accountant)
    are always Phúc Lộc. Drivers may belong to Phúc Lộc or an external vendor;
    the 'vendor' field stores that label.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Login credentials — any of phone, email, or username can be used to log in
    phone = Column(String(20), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, nullable=True, index=True)

    # Login identifier
    username = Column(String(100), nullable=False, index=True)

    # Full name for display (e.g. "Nguyễn Văn A")
    full_name = Column(String(200), nullable=True)
    # Vietnamese citizen ID (CCCD), 12 digits
    cccd = Column(String(12), unique=True, nullable=True, index=True)

    hashed_password = Column(String(255), nullable=False)

    # superadmin | director | accountant | driver
    role = Column(String(20), default="driver", nullable=False)

    # For drivers: which vendor/company they come from. "Phúc Lộc" = internal driver.
    vendor = Column(String(255), nullable=True, index=True)

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
