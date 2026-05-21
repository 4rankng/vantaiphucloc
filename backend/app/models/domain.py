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
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    driver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                       nullable=False, index=True)
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
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"),
                        nullable=True, index=True)
    category = Column(String(20), nullable=False, index=True)
    # XANG_DAU | SUA_CHUA | TIEN_LUAT | KHAC
    amount = Column(Integer, nullable=False)   # VND
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
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)


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
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)


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
    operation_type = Column(String(20), nullable=True, index=True)  # XUAT_NHAP_TAU|CHUYEN_BAI|LAY_VO_HA_HANG|CHAY_SA_LAN|DONG_KHO
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "client_id", "operation_type", "work_type",
            "pickup_location_id", "dropoff_location_id",
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
# DeliveredTrip (driver trip — created by driver app)
# ---------------------------------------------------------------------------

class DeliveredTrip(AuditableMixin, Base):
    __tablename__ = "delivered_trips"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    pickup_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    dropoff_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True, index=True)
    vessel = Column(String(100), nullable=True)
    operation_type = Column(String(20), nullable=True, index=True)
    work_type = Column(String(10), nullable=False)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    gps_address = Column(String(500), nullable=True)
    revenue = Column(Integer, nullable=False, default=0)
    driver_salary = Column(Integer, nullable=False, default=0)
    allowance = Column(Integer, nullable=False, default=0)
    trip_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="PENDING")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_delivered_trips_driver_id_status", "driver_id", "status"),
        Index("ix_delivered_trips_status", "status"),
        Index("ix_delivered_trips_created_at", "created_at"),
    )


class DeliveredTripContainer(Base):
    __tablename__ = "delivered_trip_containers"

    id = Column(Integer, primary_key=True, index=True)
    delivered_trip_id = Column(
        Integer,
        ForeignKey("delivered_trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    container_number = Column(String(50), nullable=False, index=True)
    cont_type = Column(String(10), nullable=False)
    photo_url = Column(String(1000), nullable=True)
    photo_lat = Column(Float, nullable=True)
    photo_lng = Column(Float, nullable=True)
    photo_timestamp = Column(DateTime(timezone=True), nullable=True)
    photo_address = Column(String(500), nullable=True)


# ---------------------------------------------------------------------------
# BookedTrip (customer order — from Excel import or manual entry)
# ---------------------------------------------------------------------------

class BookedTrip(AuditableMixin, Base):
    __tablename__ = "booked_trips"

    id = Column(Integer, primary_key=True, index=True)
    trip_date = Column(Date, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    pickup_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    dropoff_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    vessel = Column(String(100), nullable=True)
    vehicle_plate = Column(String(50), nullable=True)
    operation_type = Column(String(20), nullable=True, index=True)
    work_type = Column(String(10), nullable=False)
    revenue = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="PENDING")
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_booked_trips_status", "status"),
        Index("ix_booked_trips_trip_date", "trip_date"),
        Index("ix_booked_trips_client_id_trip_date", "client_id", "trip_date"),
    )


class BookedTripContainer(Base):
    __tablename__ = "booked_trip_containers"

    id = Column(Integer, primary_key=True, index=True)
    booked_trip_id = Column(
        Integer,
        ForeignKey("booked_trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    container_number = Column(String(50), nullable=False, index=True)
    cont_type = Column(String(10), nullable=False)


# ---------------------------------------------------------------------------
# MatchedTrips (enriched join table — formerly Reconciliation)
# ---------------------------------------------------------------------------

class Reconciliation(AuditableMixin, Base):
    __tablename__ = "matched_trips"

    id = Column(Integer, primary_key=True, index=True)
    booked_trip_id = Column(
        Integer,
        ForeignKey("booked_trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    delivered_trip_id = Column(
        Integer,
        ForeignKey("delivered_trips.id", ondelete="CASCADE"),
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
        UniqueConstraint("booked_trip_id", "delivered_trip_id", "is_active",
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
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"),
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
        UniqueConstraint("client_id", "structure_hash",
                         name="uq_import_templates_client_structure"),
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


# ---------------------------------------------------------------------------
# CustomerReconciliationImport (file đối soát do khách hàng gửi lại)
# ---------------------------------------------------------------------------

class CustomerReconciliationImport(Base):
    """One upload of a customer's reconciliation file.

    The customer replies to our monthly trip report saying which trips
    they accept (MATCHED) or reject (REJECTED). We parse the file into
    rows (see :class:`CustomerReconciliationRow`) and apply them via the
    reconciliation use cases on commit.
    """

    __tablename__ = "customer_reconciliation_imports"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(
        Integer,
        ForeignKey("clients.id"),
        nullable=False,
        index=True,
    )
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    source_filename = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default="PARSED")  # PARSED | APPLIED
    summary = Column(JSON_TYPE, nullable=True)  # totals by status, errors
    uploaded_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    applied_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        Index(
            "ix_customer_recon_imports_client_uploaded",
            "client_id",
            "uploaded_at",
        ),
    )


class CustomerReconciliationRow(Base):
    """One parsed row from a customer reconciliation upload."""

    __tablename__ = "customer_reconciliation_rows"

    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(
        Integer,
        ForeignKey("customer_reconciliation_imports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    container_number = Column(String(50), nullable=True, index=True)
    trip_date = Column(Date, nullable=True)
    # Customer's verdict on this row.
    customer_status = Column(String(20), nullable=False)  # MATCHED | REJECTED | UNKNOWN
    customer_note = Column(String(500), nullable=True)
    # Resolved against our BookedTrip table (nullable when no match found).
    resolved_booked_trip_id = Column(
        Integer,
        ForeignKey("booked_trips.id"),
        nullable=True,
        index=True,
    )
    # Row-level apply result: APPLIED | SKIPPED | FAILED | UNRESOLVED (defaults).
    apply_status = Column(String(20), nullable=False, default="PENDING")
    apply_message = Column(String(500), nullable=True)
    # Diff classification: ok | rejected | amount_changed | container_changed | added | missing
    diff_classification = Column(String(30), nullable=True)
    # Amount comparison
    customer_amount = Column(Integer, nullable=True)  # Amount from customer's file
    our_amount = Column(Integer, nullable=True)  # Our amount for the matched trip


# ---------------------------------------------------------------------------
# VendorReconciliationImport (file đối soát do nhà xe gửi)
# ---------------------------------------------------------------------------

class VendorReconciliationImport(Base):
    """One upload of a vendor (xe ngoài) reconciliation file.

    The vendor sends a monthly Excel listing containers they ran on
    Phúc Lộc's behalf.  We parse it into rows and compare against our
    DeliveredTrips (vendor_id == this vendor, period in range).
    After review the import is APPLIED — vendor_amount lands on matched WOs.
    """

    __tablename__ = "vendor_reconciliation_imports"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
        index=True,
    )
    period_from = Column(Date, nullable=False)
    period_to = Column(Date, nullable=False)
    source_filename = Column(String(500), nullable=True)
    # PENDING_REVIEW | APPLIED | DISCARDED
    status = Column(String(20), nullable=False, default="PENDING_REVIEW")
    totals = Column(JSON_TYPE, nullable=True)  # {matched, vendor_only, our_only, disputed}
    notes = Column(String(1000), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    applied_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        Index("ix_vendor_recon_imports_vendor_uploaded", "vendor_id", "uploaded_at"),
        Index("ix_vendor_recon_imports_status", "status"),
    )


class VendorReconciliationRow(Base):
    """One parsed row from a vendor reconciliation upload."""

    __tablename__ = "vendor_reconciliation_rows"

    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(
        Integer,
        ForeignKey("vendor_reconciliation_imports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    container_number = Column(String(50), nullable=True, index=True)
    work_type = Column(String(10), nullable=True)      # E20 | E40 | F20 | F40
    route_text = Column(String(500), nullable=True)    # free-text from vendor file
    trip_date = Column(Date, nullable=True)
    vendor_amount = Column(Integer, nullable=True)     # VND, nullable until confirmed
    # MATCHED | VENDOR_ONLY | OUR_ONLY | DISPUTED | IGNORED
    match_status = Column(String(20), nullable=False, default="VENDOR_ONLY", index=True)
    matched_delivered_trip_id = Column(
        Integer,
        ForeignKey("delivered_trips.id"),
        nullable=True,
        index=True,
    )
    reviewer_note = Column(String(500), nullable=True)
