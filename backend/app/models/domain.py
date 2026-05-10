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
# Location
# ---------------------------------------------------------------------------

class Location(AuditableMixin, Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    # GPS coords (nullable — many locations are auto-created from imports
    # without coords; backfilled later by driver-pin or admin tools).
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    geocoded_at = Column(DateTime(timezone=True), nullable=True)
    geocode_source = Column(String(20), nullable=True)
    pending_geocode = Column(Boolean, default=True, nullable=False)
    # Provenance — lets admins filter "auto-created from import".
    created_via = Column(String(30), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # Set to true when the resolver auto-linked via fuzzy match.
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
# Client
# ---------------------------------------------------------------------------

class Vendor(AuditableMixin, Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    type = Column(String(20), nullable=True)           # company | individual
    phone = Column(String(50), nullable=True)
    tax_code = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    contact_person = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


class Client(AuditableMixin, Base):
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
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

class Route(AuditableMixin, Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    route = Column(String(500), nullable=False)
    pickup_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    dropoff_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("pickup_location_id", "dropoff_location_id",
                         name="uq_routes_lane"),
    )


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------

class Pricing(AuditableMixin, Base):
    __tablename__ = "pricings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    work_type = Column(String(10), nullable=False)     # E20 | E40 | F20 | F40
    pickup_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    dropoff_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("client_id", "work_type",
                         "pickup_location_id", "dropoff_location_id",
                         name="uq_pricings_lane"),
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
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Integer, nullable=False, default=0)
    driver_salary = Column(Integer, nullable=False, default=0)
    allowance = Column(Integer, nullable=False, default=0)


# ---------------------------------------------------------------------------
# WorkOrder
# ---------------------------------------------------------------------------

class WorkOrder(AuditableMixin, Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    code = Column(String(20), nullable=True, unique=True, index=True)  # e.g. ABC0011
    route = Column(String(500), nullable=False)
    pickup_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    dropoff_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tractor_plate = Column(String(20), nullable=False)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    gps_address = Column(String(500), nullable=True)
    unit_price = Column(Integer, nullable=False)       # VND
    driver_salary = Column(Integer, nullable=False)    # VND
    allowance = Column(Integer, nullable=False)        # VND
    earning = Column(Integer, nullable=False)          # = driver_salary + allowance
    pricing_id = Column(Integer, ForeignKey("pricings.id"), nullable=True)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING | MATCHED | COMPLETED | CANCELLED
    is_locked = Column(Boolean, nullable=False, default=False)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_work_orders_driver_id_status", "driver_id", "status"),
        Index("ix_work_orders_status", "status"),
        Index("ix_work_orders_created_at", "created_at"),
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
    container_number = Column(String(50), nullable=False, index=True)
    work_type = Column(String(10), nullable=False)     # E20 | E40 | F20 | F40
    photo_url = Column(String(1000), nullable=True)
    photo_lat = Column(Float, nullable=True)
    photo_lng = Column(Float, nullable=True)
    photo_timestamp = Column(DateTime(timezone=True), nullable=True)
    photo_address = Column(String(500), nullable=True)


# ---------------------------------------------------------------------------
# TripOrder
# ---------------------------------------------------------------------------

class TripOrder(AuditableMixin, Base):
    __tablename__ = "trip_orders"

    id = Column(Integer, primary_key=True, index=True)
    trip_date = Column(Date, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    code = Column(String(20), nullable=True, unique=True, index=True)  # e.g. ABC0011
    route = Column(String(500), nullable=False)
    pickup_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    dropoff_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    pricing_id = Column(Integer, ForeignKey("pricings.id"), nullable=True)
    unit_price = Column(Integer, nullable=False)       # VND
    driver_salary = Column(Integer, nullable=False)    # VND
    allowance = Column(Integer, nullable=False)        # VND
    revenue = Column(Integer, nullable=False)          # VND
    status = Column(String(20), nullable=False, default="DRAFT")  # DRAFT | PENDING | COMPLETED | CANCELLED
    is_confirmed = Column(Boolean, nullable=False, default=False)  # Reconciliation confirmation
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who confirmed
    confirmed_at = Column(DateTime(timezone=True), nullable=True)  # When confirmed
    is_locked = Column(Boolean, nullable=False, default=False)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    # Immutable provenance — the original strings as the source file or
    # create form provided them, before LocationResolverService normalized.
    pickup_raw = Column(String(500), nullable=True)
    dropoff_raw = Column(String(500), nullable=True)
    location_review_needed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_trip_orders_is_confirmed", "is_confirmed"),
        Index("ix_trip_orders_confirmed_by", "confirmed_by"),
        Index("ix_trip_orders_status", "status"),
        Index("ix_trip_orders_trip_date", "trip_date"),
        Index("ix_trip_orders_client_id_trip_date", "client_id", "trip_date"),
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
    container_number = Column(String(50), nullable=False, index=True)
    work_type = Column(String(10), nullable=False)     # E20 | E40 | F20 | F40
    # Detail fields populated by the import pipeline.
    container_size = Column(String(10), nullable=True)        # "20" | "40"
    container_type = Column(String(20), nullable=True)        # ISO code: 22G0, 45G1, …
    freight_kind = Column(String(2), nullable=True)           # "F" | "E"
    gross_weight_kg = Column(Float, nullable=True)            # kg
    seal_no = Column(String(80), nullable=True)
    commodity = Column(String(500), nullable=True)
    container_metadata = Column(JSON_TYPE, nullable=True)


# ---------------------------------------------------------------------------
# TripContainerPhoto — many photos per container (pickup / dropoff /
# seal / EIR scan / other). Populated by the driver mobile app.
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# CustomerImportTemplate — caches the column-mapping the user has confirmed
# for a (client, sheet structure) pair. On subsequent imports of files with
# the same structure_hash, the pipeline skips heuristic + LLM steps and
# reuses the saved mapping. The user can still override any column.
# ---------------------------------------------------------------------------

class CustomerImportTemplate(Base):
    __tablename__ = "customer_import_templates"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"),
                       nullable=True, index=True)
    template_name = Column(String(255), nullable=False)
    structure_hash = Column(String(64), nullable=False, index=True)
    sheet_name = Column(String(255), nullable=False)
    header_row_index = Column(Integer, nullable=False)
    column_mapping = Column(JSON_TYPE, nullable=False)
    # LLM-resolved (header_hash → (canonical_field, confidence)) so a second
    # file with the same structure never re-pays the Gemini cost.
    llm_cache = Column(JSON_TYPE, nullable=True)
    last_used_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    last_used_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("client_id", "structure_hash",
                         name="uq_import_templates_client_structure"),
    )
