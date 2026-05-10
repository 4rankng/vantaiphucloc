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
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

# Use JSONB on Postgres, fall back to JSON on sqlite (used in unit tests).
JSON_TYPE = JSON().with_variant(JSONB(), "postgresql")

from app.database import Base
from app.models.mixins import AuditableMixin


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Vehicle
# ---------------------------------------------------------------------------

class Vehicle(AuditableMixin, Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String(20), nullable=False, unique=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# Partner (unified clients + vendors)
# ---------------------------------------------------------------------------

class Partner(AuditableMixin, Base):
    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=True, unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    partner_type = Column(String(20), nullable=False)  # client | vendor | both
    partner_role = Column(String(20), nullable=True)  # shipping_line | factory | transport | other
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

    __table_args__ = (
        Index("ix_locations_lat_lng", "lat", "lng"),
    )


class LocationAlias(Base):
    __tablename__ = "location_aliases"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    alias = Column(String(255), nullable=False)
    alias_normalized = Column(String(255), nullable=False, unique=True)
    source = Column(String(30), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="PENDING", index=True)
    confirmed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    rejected_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    merge_target_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------

class Pricing(AuditableMixin, Base):
    __tablename__ = "pricings"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=False, index=True)
    work_type = Column(String(10), nullable=False)     # E20 | E40 | F20 | F40
    pickup_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    dropoff_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("partner_id", "work_type",
                         "pickup_location_id", "dropoff_location_id",
                         name="uq_pricings_lane"),
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
# WorkOrder (driver trip — created by driver app)
# ---------------------------------------------------------------------------

class WorkOrder(AuditableMixin, Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=False, index=True)
    code = Column(String(20), nullable=True, unique=True, index=True)
    pickup_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    dropoff_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True, index=True)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    gps_address = Column(String(500), nullable=True)
    unit_price = Column(Integer, nullable=False, default=0)       # VND
    driver_salary = Column(Integer, nullable=False, default=0)    # VND
    allowance = Column(Integer, nullable=False, default=0)        # VND
    pricing_id = Column(Integer, ForeignKey("pricings.id"), nullable=True)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING | MATCHED
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_work_orders_driver_id_status", "driver_id", "status"),
        Index("ix_work_orders_status", "status"),
        Index("ix_work_orders_created_at", "created_at"),
    )


class WorkOrderContainer(Base):
    __tablename__ = "work_order_containers"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(
        Integer,
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    container_number = Column(String(50), nullable=False, index=True)
    work_type = Column(String(10), nullable=False)     # E20 | E40 | F20 | F40
    photo_url = Column(String(1000), nullable=True)
    photo_lat = Column(Float, nullable=True)
    photo_lng = Column(Float, nullable=True)
    photo_timestamp = Column(DateTime(timezone=True), nullable=True)
    photo_address = Column(String(500), nullable=True)


# ---------------------------------------------------------------------------
# TripOrder (customer order — from Excel import or manual entry)
# ---------------------------------------------------------------------------

class TripOrder(AuditableMixin, Base):
    __tablename__ = "trip_orders"

    id = Column(Integer, primary_key=True, index=True)
    trip_date = Column(Date, nullable=False)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=False, index=True)
    code = Column(String(20), nullable=True, unique=True, index=True)
    pickup_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    dropoff_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    pricing_id = Column(Integer, ForeignKey("pricings.id"), nullable=True)
    unit_price = Column(Integer, nullable=False, default=0)       # VND
    driver_salary = Column(Integer, nullable=False, default=0)    # VND
    allowance = Column(Integer, nullable=False, default=0)        # VND
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING | MATCHED
    pickup_raw = Column(String(500), nullable=True)
    dropoff_raw = Column(String(500), nullable=True)
    location_review_needed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_trip_orders_status", "status"),
        Index("ix_trip_orders_trip_date", "trip_date"),
        Index("ix_trip_orders_partner_id_trip_date", "partner_id", "trip_date"),
    )


class TripOrderContainer(Base):
    __tablename__ = "trip_order_containers"

    id = Column(Integer, primary_key=True, index=True)
    trip_order_id = Column(
        Integer,
        ForeignKey("trip_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    container_number = Column(String(50), nullable=False, index=True)
    work_type = Column(String(10), nullable=False)
    container_size = Column(String(10), nullable=True)
    container_type = Column(String(20), nullable=True)
    freight_kind = Column(String(2), nullable=True)
    gross_weight_kg = Column(Float, nullable=True)
    seal_no = Column(String(80), nullable=True)
    commodity = Column(String(500), nullable=True)
    container_metadata = Column(JSON_TYPE, nullable=True)


class TripContainerPhoto(Base):
    __tablename__ = "trip_container_photos"

    id = Column(Integer, primary_key=True, index=True)
    trip_container_id = Column(
        Integer,
        ForeignKey("trip_order_containers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kind = Column(String(20), nullable=False, index=True)
    file_url = Column(String(1000), nullable=False)
    caption = Column(String(500), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)


# ---------------------------------------------------------------------------
# TripOrder <-> WorkOrder join table (many-to-many)
# ---------------------------------------------------------------------------

class TripOrderWorkOrder(Base):
    __tablename__ = "trip_order_work_orders"

    trip_order_id = Column(
        Integer,
        ForeignKey("trip_orders.id", ondelete="CASCADE"),
        primary_key=True,
    )
    work_order_id = Column(
        Integer,
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        primary_key=True,
    )


# ---------------------------------------------------------------------------
# Reconciliation (enriched join table)
# ---------------------------------------------------------------------------

class Reconciliation(AuditableMixin, Base):
    __tablename__ = "reconciliations"

    id = Column(Integer, primary_key=True, index=True)
    trip_order_id = Column(
        Integer,
        ForeignKey("trip_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    work_order_id = Column(
        Integer,
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    match_score = Column(Float, nullable=False, default=0.0)
    matched_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    matched_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    unmatched_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    unmatched_at = Column(DateTime(timezone=True), nullable=True)
    reason = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("trip_order_id", "work_order_id", "is_active",
                         name="uq_reconciliations_active"),
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
# CustomerImportTemplate
# ---------------------------------------------------------------------------

class CustomerImportTemplate(Base):
    __tablename__ = "customer_import_templates"

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"),
                        nullable=True, index=True)
    template_name = Column(String(255), nullable=False)
    structure_hash = Column(String(64), nullable=False, index=True)
    sheet_name = Column(String(255), nullable=False)
    header_row_index = Column(Integer, nullable=False)
    column_mapping = Column(JSON_TYPE, nullable=False)
    llm_cache = Column(JSON_TYPE, nullable=True)
    last_used_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    last_used_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("partner_id", "structure_hash",
                         name="uq_import_templates_partner_structure"),
    )
