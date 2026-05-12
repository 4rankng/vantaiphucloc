"""Domain aggregates for the Operations context.

Pure Python — no SQLAlchemy / Pydantic / FastAPI imports. Two aggregate
roots:

  - **TripOrder** — đơn hàng. Owns containers (with photos inside) and
    tracks reconciliation state (matched WorkOrder ids, confirmation,
    lock).

  - **WorkOrder** — phiếu làm việc. Owns containers and GPS metadata,
    tracks driver assignment, lock state, and pricing snapshot.

The TripOrder ↔ WorkOrder match is a separate domain object —
`MatchedWorkOrders`. Reconciliation use cases create / break those
links and flip statuses on both sides accordingly.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.contexts.operations.domain.exceptions import (
    ContainerCountInvalid,
    InvalidStateTransition,
    TripOrderLocked,
)
from app.contexts.operations.domain.value_objects import (
    Money,
    PhotoKind,
    TripContainerPhotoId,
    TripOrderContainerId,
    TripOrderId,
    TripOrderStatus,
    WorkOrderContainerId,
    WorkOrderId,
    WorkOrderStatus,
    WorkType,
    normalize_work_type,
)
from app.utils.iso6346 import validate_container_number


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _validate_container_count(work_type: str, count: int) -> None:
    """Vietnamese tractor-trailer constraints:

      - 40ft (E40/F40) ⇒ exactly 1 container
      - 20ft (E20/F20) ⇒ 1 or 2 containers (twin lift)
    """
    if count < 1:
        raise ContainerCountInvalid(work_type, count)
    wt = (work_type or "").strip().upper()
    if wt.endswith("40") and count > 1:
        raise ContainerCountInvalid(wt, count)
    if wt.endswith("20") and count > 2:
        raise ContainerCountInvalid(wt, count)


# ── TripOrder aggregate ─────────────────────────────────────────


@dataclass
class TripContainerPhoto:
    """Photo attached to a TripOrderContainer (inside the TripOrder aggregate).

    `kind` is open: pickup / dropoff / seal / eir / other …
    """

    id: TripContainerPhotoId | None
    trip_container_id: TripOrderContainerId
    kind: PhotoKind
    file_url: str
    caption: str | None = None
    uploaded_at: datetime = field(default_factory=_utcnow)
    uploaded_by: int | None = None
    created_at: datetime = field(default_factory=_utcnow)


@dataclass
class TripOrderContainer:
    """Container line inside a TripOrder aggregate. Holds photos."""

    id: TripOrderContainerId | None
    trip_order_id: TripOrderId | None  # None until parent is saved
    container_number: str
    work_type: str
    container_size: str | None = None       # "20" | "40"
    container_type: str | None = None       # ISO code: 22G0, 45G1, …
    freight_kind: str | None = None         # "F" | "E"
    gross_weight_kg: float | None = None
    seal_no: str | None = None
    commodity: str | None = None
    container_metadata: dict | None = None
    photos: list[TripContainerPhoto] = field(default_factory=list)

    def attach_photo(
        self,
        *,
        kind: PhotoKind,
        file_url: str,
        caption: str | None = None,
        uploaded_by: int | None = None,
    ) -> TripContainerPhoto:
        if self.id is None:
            raise ValueError("cannot attach photo to an unsaved container")
        photo = TripContainerPhoto(
            id=None,
            trip_container_id=self.id,
            kind=kind,
            file_url=file_url,
            caption=caption,
            uploaded_by=uploaded_by,
        )
        self.photos.append(photo)
        return photo


@dataclass
class TripOrder:
    """TripOrder (đơn hàng) aggregate root.

    Owns containers (`TripOrderContainer`) and, transitively, container
    photos. Many-to-many with WorkOrder lives outside the aggregate as
    `matched_work_order_ids`; reconciliation use cases keep the join
    in sync.
    """

    id: TripOrderId | None
    trip_date: object                       # `datetime.date` — kept loose to avoid imports
    partner_id: int
    pickup_location_id: int
    dropoff_location_id: int
    unit_price: Money = 0
    driver_salary: Money = 0
    allowance: Money = 0
    status: str = TripOrderStatus.PENDING
    code: str | None = None
    pricing_id: int | None = None
    pickup_raw: str | None = None
    dropoff_raw: str | None = None
    location_review_needed: bool = False
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    containers: list[TripOrderContainer] = field(default_factory=list)
    matched_work_order_ids: list[int] = field(default_factory=list)
    matched_by: int = 0
    is_locked: bool = False
    is_confirmed: bool = False
    locked_by: int | None = None
    confirmed_by: int | None = None

    # ── behaviour ────────────────────────────────────────────

    def add_container(
        self,
        *,
        container_number: str,
        work_type: str,
        container_size: str | None = None,
        container_type: str | None = None,
        freight_kind: str | None = None,
        gross_weight_kg: float | None = None,
        seal_no: str | None = None,
        commodity: str | None = None,
        container_metadata: dict | None = None,
    ) -> TripOrderContainer:
        wt = normalize_work_type(work_type)
        # Validate ISO 6346 container number
        valid, err = validate_container_number(container_number)
        if not valid:
            raise ValueError(f"Invalid container number {container_number!r}: {err}")
        # All containers in a trip must share work_type — twin lift rule.
        if self.containers:
            existing_wt = self.containers[0].work_type
            if wt != existing_wt:
                raise ValueError(
                    f"mixed work types not allowed: trip has {existing_wt!s}, "
                    f"new container is {wt!s}"
                )
        _validate_container_count(wt, len(self.containers) + 1)
        c = TripOrderContainer(
            id=None,
            trip_order_id=self.id,
            container_number=container_number,
            work_type=wt,
            container_size=container_size,
            container_type=container_type,
            freight_kind=freight_kind,
            gross_weight_kg=gross_weight_kg,
            seal_no=seal_no,
            commodity=commodity,
            container_metadata=container_metadata,
        )
        self.containers.append(c)
        self.updated_at = _utcnow()
        return c

    def apply_pricing_snapshot(
        self,
        *,
        unit_price: Money,
        driver_salary: Money,
        allowance: Money,
        pricing_id: int | None,
    ) -> None:
        self.unit_price = int(unit_price)
        self.driver_salary = int(driver_salary)
        self.allowance = int(allowance)
        self.pricing_id = pricing_id
        self.updated_at = _utcnow()

    def match(self) -> None:
        """PENDING → MATCHED. Idempotent: MATCHED → MATCHED is a no-op
        (multi-match TO-centric: TO may already be matched with other WOs)."""
        if self.status == TripOrderStatus.MATCHED:
            return
        if self.status != TripOrderStatus.PENDING:
            raise InvalidStateTransition(
                kind="TripOrder",
                current=self.status,
                attempted=TripOrderStatus.MATCHED,
            )
        self.status = TripOrderStatus.MATCHED
        self.updated_at = _utcnow()

    def unmatch(self) -> None:
        """MATCHED → PENDING. Only valid when called by reconciliation
        (the caller checks remaining links first)."""
        if self.status == TripOrderStatus.PENDING:
            return
        if self.status != TripOrderStatus.MATCHED:
            raise InvalidStateTransition(
                kind="TripOrder",
                current=self.status,
                attempted=TripOrderStatus.PENDING,
            )
        self.status = TripOrderStatus.PENDING
        self.updated_at = _utcnow()

    def link_work_order(self, work_order_id: int, matched_by: int = 0) -> None:
        if work_order_id not in self.matched_work_order_ids:
            self.matched_work_order_ids.append(int(work_order_id))
            self.matched_by = matched_by
            self.updated_at = _utcnow()

    def unlink_work_order(self, work_order_id: int) -> None:
        if work_order_id in self.matched_work_order_ids:
            self.matched_work_order_ids.remove(int(work_order_id))
            self.updated_at = _utcnow()

    def lock(self, user_id: int | None = None) -> None:
        """Lock the TripOrder, preventing cancellation."""
        self.is_locked = True
        self.locked_by = user_id
        self.updated_at = _utcnow()

    def unlock(self) -> None:
        """Unlock the TripOrder."""
        self.is_locked = False
        self.locked_by = None
        self.updated_at = _utcnow()

    def confirm(self, user_id: int | None = None) -> None:
        """Confirm the TripOrder — permanent, no unconfirm."""
        if self.is_locked is False:
            raise TripOrderLocked(
                "TripOrder must be locked before confirmation"
            )
        self.is_confirmed = True
        self.confirmed_by = user_id
        self.status = TripOrderStatus.CONFIRMED
        self.updated_at = _utcnow()

    def cancel(self) -> None:
        """Cancel the TripOrder. Blocked when locked."""
        if self.is_locked:
            raise TripOrderLocked(
                "Cannot cancel a locked TripOrder"
            )
        self.status = TripOrderStatus.CANCELLED
        self.updated_at = _utcnow()


@dataclass
class WorkOrderContainer:
    """Container line inside a WorkOrder aggregate. Carries the photo
    that the driver took at pickup."""

    id: WorkOrderContainerId | None
    work_order_id: WorkOrderId | None
    container_number: str
    work_type: str
    photo_url: str | None = None
    photo_lat: float | None = None
    photo_lng: float | None = None
    photo_timestamp: datetime | None = None
    photo_address: str | None = None


@dataclass
class WorkOrder:
    """WorkOrder (phiếu làm việc) aggregate root.

    A driver creates one per delivery. Status transitions:
    PENDING → MATCHED (by accountant during reconciliation), MATCHED →
    COMPLETED (after settlement), or PENDING/MATCHED → COMPLETED
    directly. CANCELLED is a terminal escape hatch.
    """

    id: WorkOrderId | None
    partner_id: int
    pickup_location_id: int
    dropoff_location_id: int
    driver_id: int
    vehicle_id: int | None = None
    unit_price: Money = 0
    driver_salary: Money = 0
    allowance: Money = 0
    code: str | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    gps_address: str | None = None
    pricing_id: int | None = None
    trip_date: object | None = None  # explicit trip execution date; falls back to created_at
    status: str = WorkOrderStatus.PENDING
    is_locked: bool = False
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    containers: list[WorkOrderContainer] = field(default_factory=list)

    def add_container(
        self,
        *,
        container_number: str,
        work_type: str,
        photo_url: str | None = None,
        photo_lat: float | None = None,
        photo_lng: float | None = None,
        photo_timestamp: datetime | None = None,
        photo_address: str | None = None,
    ) -> WorkOrderContainer:
        wt = normalize_work_type(work_type)
        # Validate ISO 6346 container number
        valid, err = validate_container_number(container_number)
        if not valid:
            raise ValueError(f"Invalid container number {container_number!r}: {err}")
        if self.containers:
            existing_wt = self.containers[0].work_type
            if wt != existing_wt:
                raise ValueError(
                    f"mixed work types not allowed: WO has {existing_wt!s}, "
                    f"new container is {wt!s}"
                )
        _validate_container_count(wt, len(self.containers) + 1)
        c = WorkOrderContainer(
            id=None,
            work_order_id=self.id,
            container_number=container_number,
            work_type=wt,
            photo_url=photo_url,
            photo_lat=photo_lat,
            photo_lng=photo_lng,
            photo_timestamp=photo_timestamp,
            photo_address=photo_address,
        )
        self.containers.append(c)
        self.updated_at = _utcnow()
        return c

    def apply_pricing_snapshot(
        self,
        *,
        unit_price: Money,
        driver_salary: Money,
        allowance: Money,
        pricing_id: int | None,
    ) -> None:
        # WO is 1:1 with TO — overwrite (no accumulation needed)
        self.unit_price = int(unit_price)
        self.driver_salary = int(driver_salary)
        self.allowance = int(allowance)
        self.pricing_id = pricing_id
        self.updated_at = _utcnow()

    def match(self) -> None:
        """PENDING → MATCHED. Idempotent: MATCHED → MATCHED is a no-op
        (multi-container run — WO may already be matched)."""
        if self.status == WorkOrderStatus.MATCHED:
            return
        if self.status != WorkOrderStatus.PENDING:
            raise InvalidStateTransition(
                kind="WorkOrder",
                current=self.status,
                attempted=WorkOrderStatus.MATCHED,
            )
        self.status = WorkOrderStatus.MATCHED
        self.updated_at = _utcnow()

    def unmatch(self) -> None:
        """MATCHED → PENDING."""
        if self.status != WorkOrderStatus.MATCHED:
            raise InvalidStateTransition(
                kind="WorkOrder",
                current=self.status,
                attempted=WorkOrderStatus.PENDING,
            )
        self.status = WorkOrderStatus.PENDING
        self.updated_at = _utcnow()



