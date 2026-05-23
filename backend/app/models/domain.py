"""
Domain ORM models for Vantaiphucloc.

Single-tenant app — Phúc Lộc is the only company. No company_id FKs.
Monetary fields are stored as Integer (Vietnamese Dong, no decimals).
All timestamps use DateTime(timezone=True) so PostgreSQL stores them
as TIMESTAMP WITH TIME ZONE.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base
from app.models.mixins import AuditableMixin

# Use JSONB on Postgres, fall back to JSON on sqlite (used in unit tests).
JSON_TYPE = JSON().with_variant(JSONB(), "postgresql")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Vehicle
# ---------------------------------------------------------------------------


class Vehicle(AuditableMixin, Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String(20), nullable=False, unique=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# VehicleDriver — many-to-many vehicle ↔ driver with effective dates
# ---------------------------------------------------------------------------


class VehicleDriver(Base):
    """Associates a driver with a vehicle for a date range.

    ``effective_to=NULL`` means currently active.
    ``is_active=True`` is the live record; set False to soft-deactivate without
    losing history.

    Backfilled from ``Vehicle.driver_id`` on migration 009.
    """

    __tablename__ = "vehicle_drivers"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    driver_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# VehicleExpense — CP Xe (xăng dầu, sửa chữa, tiền luật, khác)
# ---------------------------------------------------------------------------


class VehicleExpense(AuditableMixin, Base):
    """Records a per-vehicle cost item for P&L calculations.

    All monetary amounts are Integer VND.
    """

    __tablename__ = "vehicle_expenses"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    category = Column(String(20), nullable=False, index=True)
    # XANG_DAU | SUA_CHUA | TIEN_LUAT | KHAC
    amount = Column(Integer, nullable=False)  # VND
    expense_date = Column(Date, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    receipt_url = Column(String(1000), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_vehicle_expenses_vehicle_date", "vehicle_id", "expense_date"),
        Index("ix_vehicle_expenses_category_date", "category", "expense_date"),
    )


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


class Client(AuditableMixin, Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=True, unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    tax_code = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    contact_person = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# Vendor
# ---------------------------------------------------------------------------


class Vendor(AuditableMixin, Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=True, unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    tax_code = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    contact_person = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


Partner = Client  # backward compat alias


# ---------------------------------------------------------------------------
# Location
# ---------------------------------------------------------------------------


class Location(AuditableMixin, Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    geocoded_at = Column(DateTime(timezone=True), nullable=True)
    geocode_source = Column(String(20), nullable=True)
    pending_geocode = Column(Boolean, default=True, nullable=False)
    created_via = Column(String(30), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    location_review_needed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (Index("ix_locations_lat_lng", "lat", "lng"),)


class LocationAlias(Base):
    __tablename__ = "location_aliases"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(
        Integer,
        ForeignKey("locations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alias = Column(String(255), nullable=False)
    alias_normalized = Column(String(255), nullable=False, unique=True)
    source = Column(String(30), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------


class Pricing(AuditableMixin, Base):
    __tablename__ = "pricings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    work_type = Column(String(30), nullable=False)  # CHUYỂN BÃI | XUẤT/NHẬP TÀU | ...
    pickup_location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=False, index=True
    )
    dropoff_location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=False, index=True
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "client_id",
            "work_type",
            "pickup_location_id",
            "dropoff_location_id",
            name="uq_pricings_lane",
        ),
    )


class PricingLine(Base):
    __tablename__ = "pricing_lines"

    id = Column(Integer, primary_key=True, index=True)
    pricing_id = Column(
        Integer,
        ForeignKey("pricings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Integer, nullable=False, default=0)
    driver_salary = Column(Integer, nullable=False, default=0)
    allowance = Column(Integer, nullable=False, default=0)


# ---------------------------------------------------------------------------
# RoutePricing — flat per-route rates (Cước tuyến)
# ---------------------------------------------------------------------------


class RoutePricing(AuditableMixin, Base):
    __tablename__ = "route_pricings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    pickup_location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=False, index=True
    )
    dropoff_location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=False, index=True
    )
    work_type = Column(String(50), nullable=False, index=True)
    f20_price = Column(Integer, nullable=True)
    f40_price = Column(Integer, nullable=True)
    e20_price = Column(Integer, nullable=True)
    e40_price = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "client_id",
            "pickup_location_id",
            "dropoff_location_id",
            "work_type",
            name="uq_route_pricings_lane",
        ),
    )


class VendorRoutePricing(AuditableMixin, Base):
    __tablename__ = "vendor_route_pricings"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    pickup_location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=False, index=True
    )
    dropoff_location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=False, index=True
    )
    work_type = Column(String(50), nullable=False, index=True)
    f20_price = Column(Integer, nullable=True)
    f40_price = Column(Integer, nullable=True)
    e20_price = Column(Integer, nullable=True)
    e40_price = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "vendor_id",
            "pickup_location_id",
            "dropoff_location_id",
            "work_type",
            name="uq_vendor_route_pricings_lane",
        ),
    )


# ---------------------------------------------------------------------------
# DeliveredTrip (driver trip — created by driver app)
# ---------------------------------------------------------------------------


class DeliveredTrip(AuditableMixin, Base):
    __tablename__ = "delivered_trips"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    pickup_location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=False, index=True
    )
    dropoff_location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=False, index=True
    )
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True, index=True)
    vessel = Column(String(100), nullable=True)
    work_type = Column(String(30), nullable=False)
    cont_number = Column(String(50), nullable=True, index=True)
    cont_type = Column(String(10), nullable=True)
    vehicle_plate = Column(String(20), nullable=True)
    booked_trip_id = Column(Integer, ForeignKey("booked_trips.id"), nullable=True, index=True)
    revenue = Column(Integer, nullable=False, default=0)
    driver_salary = Column(Integer, nullable=False, default=0)
    allowance = Column(Integer, nullable=False, default=0)
    trip_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_delivered_trips_created_at", "created_at"),
    )


# ---------------------------------------------------------------------------
# BookedTrip (customer order — from Excel import or manual entry)
# ---------------------------------------------------------------------------


class BookedTrip(AuditableMixin, Base):
    __tablename__ = "booked_trips"

    id = Column(Integer, primary_key=True, index=True)
    trip_date = Column(Date, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    pickup_location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=False, index=True
    )
    dropoff_location_id = Column(
        Integer, ForeignKey("locations.id"), nullable=False, index=True
    )
    vessel = Column(String(100), nullable=True)
    vehicle_plate = Column(String(50), nullable=True)
    work_type = Column(String(30), nullable=False)
    cont_number = Column(String(50), nullable=True, index=True)
    cont_type = Column(String(10), nullable=True)
    matched = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_booked_trips_matched", "matched"),
        Index("ix_booked_trips_trip_date", "trip_date"),
        Index("ix_booked_trips_client_id_trip_date", "client_id", "trip_date"),
    )


# ---------------------------------------------------------------------------
# Settings (key-value store for app-wide configuration)
# ---------------------------------------------------------------------------


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(500), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# DriverSalaryConfig (base salary history per driver, append-only)
# ---------------------------------------------------------------------------


class DriverSalaryConfig(Base):
    """Effective base salary for a driver, valid from ``effective_from``.

    Append-only: each rate change inserts a new row. The "current" base
    salary at any date is the row with the greatest ``effective_from <=
    target_date`` for that driver. There is no end-date column.
    """

    __tablename__ = "driver_salary_configs"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    base_salary = Column(Integer, nullable=False)  # VND
    effective_from = Column(Date, nullable=False)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "driver_id",
            "effective_from",
            name="uq_driver_salary_configs_driver_effective",
        ),
        Index(
            "ix_driver_salary_configs_driver_effective_desc",
            "driver_id",
            "effective_from",
        ),
    )
