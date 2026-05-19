"""Reconciliation use cases.

Bind a DeliveredTrip to a BookedTrip (and vice versa). The link lives
in `reconciliations`. Domain rules:

  - A BookedTrip has N containers and may match N DeliveredTrips (TO-centric).
  - A DeliveredTrip has 1 container and may match exactly 1 BookedTrip.
  - Capacity check: len(matched WOs) <= BookedTrip.containers.count
  - Pricing snapshots flow from BookedTrip onto DeliveredTrip at match time;
    they accumulate on the TO and are cleared on unmatch.
  - Status transitions: PENDING ↔ MATCHED only (no COMPLETED during match).
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession  # transaction control only

from app.contexts.operations.application.dto import (
    ReconcileInput,
    UnmatchInput,
)
from app.contexts.operations.domain.entities import BookedTrip, DeliveredTrip
from app.contexts.operations.domain.exceptions import (
    InvalidStateTransition,
    NotFound,
    OperationsError,
)
from app.contexts.operations.domain.repositories import (
    BookedTripRepository,
    DeliveredTripRepository,
)
from app.contexts.operations.domain.value_objects import (
    BookedTripId,
    BookedTripStatus,
    DeliveredTripStatus,
    DeliveredTripId,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ReconciliationConflict(OperationsError):
    """Pre-conditions for reconcile/unmatch fail (e.g. WO has no containers,
    TO is already matched). Translated to HTTP 409."""

    def __init__(self, msg: str) -> None:
        super().__init__(msg)
        self.msg = msg


class MatchTripToDeliveredTrip:
    """Bind a DeliveredTrip to a BookedTrip. After:
      - WO.status = MATCHED (PENDING → MATCHED, only if not already)
      - TO.status = MATCHED (PENDING → MATCHED, stays MATCHED if already)
      - Pricing snapshot copied from TO to WO.

    TO-centric model: a BookedTrip has N containers and may match N
    DeliveredTrips. A DeliveredTrip may only match one BookedTrip.
    Capacity: len(matched WOs) must be <= len(TO.containers).
    """

    def __init__(
        self,
        booked_trip_repo: BookedTripRepository,
        delivered_trip_repo: DeliveredTripRepository,
        session: AsyncSession,
    ) -> None:
        self.booked_trip_repo = booked_trip_repo
        self.delivered_trip_repo = delivered_trip_repo
        self.session = session

    async def __call__(self, data: ReconcileInput) -> BookedTrip:
        from app.contexts.operations.infrastructure.link_queries import (
            count_links_for_to,
            delivered_trip_has_link,
        )

        wo = await self.delivered_trip_repo.get_by_id(DeliveredTripId(data.delivered_trip_id))
        if wo is None:
            raise NotFound("DeliveredTrip", data.delivered_trip_id)

        if not wo.containers:
            raise ReconciliationConflict(
                "Work order must have at least one container before matching"
            )

        to = await self.booked_trip_repo.get_by_id(BookedTripId(data.booked_trip_id))
        if to is None:
            raise NotFound("BookedTrip", data.booked_trip_id)

        # WO must not already be matched to any TO (1:1 constraint)
        if await delivered_trip_has_link(self.session, int(wo.id)):  # type: ignore[arg-type]
            raise ReconciliationConflict(
                "Phiếu làm việc đã được ghép với một đơn hàng khác"
            )

        # TO capacity check: current links vs container count
        current_links = await count_links_for_to(
            self.session, int(to.id)  # type: ignore[arg-type]
        )
        container_count = len(to.containers)
        if container_count == 0:
            raise ReconciliationConflict(
                "Đơn hàng chưa có container"
            )
        if current_links >= container_count:
            raise ReconciliationConflict(
                f"Số đơn hàng đã vượt quá số container của chuyến "
                f"(tối đa: {container_count}, đã ghép: {current_links})"
            )

        # TO must be PENDING or MATCHED (already has some WOs linked)
        if to.status not in (BookedTripStatus.PENDING, BookedTripStatus.MATCHED):
            raise ReconciliationConflict(
                f"Đơn hàng đang ở trạng thái {to.status}, không thể ghép"
            )

        # Mutate via domain methods.
        wo.match()

        # TO transitions: PENDING → MATCHED (stays MATCHED if already)
        if to.status == BookedTripStatus.PENDING:
            to.match()
        to.link_delivered_trip(int(wo.id), matched_by=data.user_id)  # type: ignore[arg-type]

        await self.delivered_trip_repo.save(wo)
        await self.booked_trip_repo.save(to)
        return to


class UnmatchTripFromDeliveredTrip:
    """Break a TO<->WO link. WO always goes back to PENDING (1:1).
    TO goes back to PENDING only if this was the last link (no more WOs)."""

    def __init__(
        self,
        booked_trip_repo: BookedTripRepository,
        delivered_trip_repo: DeliveredTripRepository,
        session: AsyncSession,
    ) -> None:
        self.booked_trip_repo = booked_trip_repo
        self.delivered_trip_repo = delivered_trip_repo
        self.session = session

    async def __call__(self, data: UnmatchInput) -> tuple[BookedTrip, DeliveredTrip]:
        from app.contexts.operations.infrastructure.link_queries import (
            find_link,
            count_links_for_to,
        )

        link = await find_link(
            self.session,
            delivered_trip_id=data.delivered_trip_id,
            booked_trip_id=data.booked_trip_id,
        )
        if link is None:
            raise NotFound("Reconciliation", (
                data.booked_trip_id, data.delivered_trip_id
            ))

        wo = await self.delivered_trip_repo.get_by_id(DeliveredTripId(link.delivered_trip_id))
        to = await self.booked_trip_repo.get_by_id(BookedTripId(link.booked_trip_id))
        if wo is None or to is None:
            raise NotFound(
                "BookedTrip/DeliveredTrip",
                (link.booked_trip_id, link.delivered_trip_id),
            )

        # WO always resets to PENDING (1:1 with TO)
        if wo.status == DeliveredTripStatus.MATCHED:
            wo.unmatch()
        else:
            wo.status = DeliveredTripStatus.PENDING

        # Check remaining links for this TO
        remaining = await count_links_for_to(
            self.session, int(to.id)  # type: ignore[arg-type]
        )

        if remaining <= 1:
            # Last link removed — TO goes back to PENDING
            if to.status == BookedTripStatus.MATCHED:
                to.unmatch()
            else:
                to.status = BookedTripStatus.PENDING
        else:
            # Other WOs still linked — TO stays MATCHED
            pass

        to.unlink_delivered_trip(int(wo.id))  # type: ignore[arg-type]

        await self.delivered_trip_repo.save(wo)
        await self.booked_trip_repo.save(to)

        return to, wo
