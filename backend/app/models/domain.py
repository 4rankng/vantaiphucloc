"""
Domain ORM models for Vantaiphucloc.

Single-tenant app — Phúc Lộc is the only company. No company_id FKs.
Monetary fields are stored as Integer (Vietnamese Dong, no decimals).
All timestamps use DateTime(timezone=True) so PostgreSQL stores them
as TIMESTAMP WITH TIME ZONE.
"""

from datetime import datetime, date, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    type = Column(String(20), nullable=True)           # company | individual
    phone = Column(String(50), nullable=True)
    tax_code = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    contact_person = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=True, unique=True, index=True)  # Customer code
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(20), nullable=False)          # company | individual
    phone = Column(String(50), nullable=False)
    tax_code = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    contact_person = Column(String(255), nullable=True)
    outstanding_debt = Column(Integer, default=0, nullable=False)  # VND
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    route = Column(String(500), nullable=False)        # route name / description
    pickup_location = Column(String(255), nullable=True)   # Điểm lấy
    dropoff_location = Column(String(255), nullable=True)  # Điểm trả
    type_20ft = Column(Integer, nullable=False)        # VND
    type_40ft = Column(Integer, nullable=False)        # VND
    is_two_way = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------

class Pricing(Base):
    __tablename__ = "pricings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    client_name = Column(String(255), nullable=False)  # denormalized for display
    work_type = Column(String(10), nullable=False)     # E20 | E40 | F20 | F40
    route = Column(String(500), nullable=False)
    unit_price = Column(Integer, nullable=False)       # VND
    driver_salary = Column(Integer, nullable=False)    # VND
    allowance = Column(Integer, nullable=False)        # VND
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# PricingLine  (child of Pricing — cascade delete)
# ---------------------------------------------------------------------------

class PricingLine(Base):
    __tablename__ = "pricing_lines"

    id = Column(Integer, primary_key=True, index=True)
    pricing_id = Column(
        Integer,
        ForeignKey("pricings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    work_type = Column(String(10), nullable=False)
    quantity = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("pricing_id", "work_type", name="uq_pricing_lines_pricing_work_type"),
    )


# ---------------------------------------------------------------------------
# WorkOrder
# ---------------------------------------------------------------------------

class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    client_name = Column(String(255), nullable=False)  # denormalized
    route = Column(String(500), nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    driver_name = Column(String(255), nullable=False)  # denormalized
    tractor_plate = Column(String(20), nullable=False)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    gps_address = Column(String(500), nullable=True)
    unit_price = Column(Integer, nullable=False)       # VND
    driver_salary = Column(Integer, nullable=False)    # VND
    allowance = Column(Integer, nullable=False)        # VND
    earning = Column(Integer, nullable=False)          # = driver_salary + allowance
    pricing_id = Column(Integer, ForeignKey("pricings.id"), nullable=True)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING | MATCHED | COMPLETED
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_work_orders_driver_id_status", "driver_id", "status"),
    )


# ---------------------------------------------------------------------------
# WorkOrderContainer  (child of WorkOrder — cascade delete)
# ---------------------------------------------------------------------------

class WorkOrderContainer(Base):
    __tablename__ = "work_order_containers"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(
        Integer,
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    container_number = Column(String(50), nullable=False)
    work_type = Column(String(10), nullable=False)     # E20 | E40 | F20 | F40
    photo_url = Column(String(1000), nullable=True)
    photo_lat = Column(Float, nullable=True)
    photo_lng = Column(Float, nullable=True)
    photo_timestamp = Column(DateTime(timezone=True), nullable=True)
    photo_address = Column(String(500), nullable=True)


# ---------------------------------------------------------------------------
# TripOrder
# ---------------------------------------------------------------------------

class TripOrder(Base):
    __tablename__ = "trip_orders"

    id = Column(Integer, primary_key=True, index=True)
    trip_date = Column(Date, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    client_name = Column(String(255), nullable=False)  # denormalized
    work_type = Column(String(10), nullable=True)       # legacy — derived from first container
    route = Column(String(500), nullable=False)
    tractor_plate = Column(String(20), nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    driver_name = Column(String(255), nullable=False)  # denormalized
    container_number = Column(String(50), nullable=True)  # legacy — use trip_order_containers
    pricing_id = Column(Integer, ForeignKey("pricings.id"), nullable=True)
    unit_price = Column(Integer, nullable=False)       # VND
    driver_salary = Column(Integer, nullable=False)    # VND
    allowance = Column(Integer, nullable=False)        # VND
    revenue = Column(Integer, nullable=False)          # VND
    status = Column(String(20), nullable=False, default="DRAFT")  # DRAFT | PENDING | COMPLETED | CANCELLED
    is_confirmed = Column(Boolean, nullable=False, default=False)  # Reconciliation confirmation
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who confirmed
    confirmed_at = Column(DateTime(timezone=True), nullable=True)  # When confirmed
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_trip_orders_driver_id_trip_date", "driver_id", "trip_date"),
        Index("ix_trip_orders_is_confirmed", "is_confirmed"),
        Index("ix_trip_orders_confirmed_by", "confirmed_by"),
    )


# ---------------------------------------------------------------------------
# TripOrderContainer  (child of TripOrder — cascade delete)
# ---------------------------------------------------------------------------

class TripOrderContainer(Base):
    __tablename__ = "trip_order_containers"

    id = Column(Integer, primary_key=True, index=True)
    trip_order_id = Column(
        Integer,
        ForeignKey("trip_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    container_number = Column(String(50), nullable=False)
    work_type = Column(String(10), nullable=False)     # E20 | E40 | F20 | F40


# ---------------------------------------------------------------------------
# TripOrderWorkOrder  (join table — cascade delete on trip_order_id)
# ---------------------------------------------------------------------------

class TripOrderWorkOrder(Base):
    __tablename__ = "trip_order_work_orders"

    trip_order_id = Column(
        Integer,
        ForeignKey("trip_orders.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    work_order_id = Column(
        Integer,
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )


# ---------------------------------------------------------------------------
# SalaryPeriod
# ---------------------------------------------------------------------------

class SalaryPeriod(Base):
    __tablename__ = "salary_periods"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    driver_name = Column(String(255), nullable=False)  # denormalized
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    work_order_count = Column(Integer, nullable=False, default=0)
    price_per_order = Column(Integer, nullable=False, default=0)  # VND
    total_salary = Column(Integer, nullable=False, default=0)     # VND
    total_allowance = Column(Integer, nullable=False, default=0)  # VND
    total_deduction = Column(Integer, nullable=False, default=0)  # VND
    net_pay = Column(Integer, nullable=False, default=0)          # VND
    status = Column(String(20), nullable=False, default="OPEN")   # OPEN | CALCULATED | PAID
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# SalaryPeriodConfig  (singleton — one row for the whole app)
# ---------------------------------------------------------------------------

class SalaryPeriodConfig(Base):
    __tablename__ = "salary_period_configs"

    id = Column(Integer, primary_key=True, index=True)
    from_day = Column(Integer, nullable=False)   # 1–28
    to_day = Column(Integer, nullable=False)     # 1–28
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )
