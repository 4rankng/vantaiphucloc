"""Reconciliation use cases.

Bind a WorkOrder to a TripOrder (and vice versa). The link lives
in `reconciliations`. Domain rules:

  - Work order must have at least one container.
  - A WorkOrder may match multiple TripOrders (one per container in a run).
  - A TripOrder may only match one WorkOrder.
  - Pricing snapshots flow from TripOrder onto WorkOrder at match time;
    they're cleared on unmatch.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession  # transaction control only

from app.contexts.operations.application.dto import (
    ReconcileInput,
    UnmatchInput,
)
from app.contexts.operations.domain.entities import TripOrder, WorkOrder
from app.contexts.operations.domain.exceptions import (
    InvalidStateTransition,
    NotFound,
    OperationsError,
)
from app.contexts.operations.domain.repositories import (
    TripOrderRepository,
    WorkOrderRepository,
)
from app.contexts.operations.domain.value_objects import (
    TripOrderId,
    TripOrderStatus,
    WorkOrderId,
    WorkOrderStatus,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ReconciliationConflict(OperationsError):
    """Pre-conditions for reconcile/unmatch fail (e.g. WO has no containers,
    TO is already matched). Translated to HTTP 409."""

    def __init__(self, msg: str) -> None:
        super().__init__(msg)
        self.msg = msg


class MatchTripToWorkOrder:
    """Bind a WorkOrder to a TripOrder. After:
      - WO.status = MATCHED
      - TO.status = MATCHED, pricing snapshot copied to WO

    A single WorkOrder may be linked to multiple TripOrders (multi-container
    run). Each TripOrder may only be linked to one WorkOrder.
    """

    def __init__(
        self,
        to_repo: TripOrderRepository,
        wo_repo: WorkOrderRepository,
        session: AsyncSession,
    ) -> None:
        self.to_repo = to_repo
        self.wo_repo = wo_repo
        self.session = session

    async def __call__(self, data: ReconcileInput) -> TripOrder:
        from app.contexts.operations.infrastructure.link_queries import (
            trip_order_has_link,
        )

        wo = await self.wo_repo.get_by_id(WorkOrderId(data.work_order_id))
        if wo is None:
            raise NotFound("WorkOrder", data.work_order_id)

        # Container check uses ORM directly -- domain aggregate already
        # carries the count via `wo.containers`.
        if not wo.containers:
            raise ReconciliationConflict(
                "Work order must have at least one container before matching"
            )

        to = await self.to_repo.get_by_id(TripOrderId(data.trip_order_id))
        if to is None:
            raise NotFound("TripOrder", data.trip_order_id)

        # WO may already be MATCHED (multi-container run) — that's fine.
        # Only block if the TO is already linked.

        if await trip_order_has_link(self.session, int(to.id)):  # type: ignore[arg-type]
            raise ReconciliationConflict("Trip order is already matched")

        if to.status != TripOrderStatus.PENDING:
            raise ReconciliationConflict(
                "Trip order must be in PENDING status to match"
            )

        # Mutate via domain methods.
        wo.match()
        wo.is_locked = True
        wo.apply_pricing_snapshot(
            unit_price=to.unit_price,
            driver_salary=to.driver_salary,
            allowance=to.allowance,
            pricing_id=to.pricing_id,
        )

        to.match()
        # In 1:1 match, TO transitions directly to COMPLETED
        to.status = TripOrderStatus.COMPLETED
        to.link_work_order(int(wo.id), matched_by=data.user_id)  # type: ignore[arg-type]
        to.is_locked = True

        await self.wo_repo.save(wo)
        await self.to_repo.save(to)
        return to


class UnmatchTripFromWorkOrder:
    """Break a TO<->WO link. TO goes back to PENDING. WO goes back to
    PENDING only if it has no other active links (multi-container)."""

    def __init__(
        self,
        to_repo: TripOrderRepository,
        wo_repo: WorkOrderRepository,
        session: AsyncSession,
    ) -> None:
        self.to_repo = to_repo
        self.wo_repo = wo_repo
        self.session = session

    async def __call__(self, data: UnmatchInput) -> tuple[TripOrder, WorkOrder]:
        from app.contexts.operations.infrastructure.link_queries import (
            find_link,
            count_links_for_wo,
        )

        link = await find_link(
            self.session,
            work_order_id=data.work_order_id,
            trip_order_id=data.trip_order_id,
        )
        if link is None:
            raise NotFound("Reconciliation", (
                data.trip_order_id, data.work_order_id
            ))

        wo = await self.wo_repo.get_by_id(WorkOrderId(link.work_order_id))
        to = await self.to_repo.get_by_id(TripOrderId(link.trip_order_id))
        if wo is None or to is None:
            raise NotFound(
                "TripOrder/WorkOrder",
                (link.trip_order_id, link.work_order_id),
            )

        # Check remaining links for this WO
        remaining = await count_links_for_wo(
            self.session, int(wo.id)  # type: ignore[arg-type]
        )

        # Reset WO only if this was the last link
        if remaining <= 1:
            if wo.status == WorkOrderStatus.MATCHED:
                wo.unmatch()
            else:
                wo.status = WorkOrderStatus.PENDING
            wo.is_locked = False
            wo.driver_salary = 0
            wo.allowance = 0
            wo.unit_price = 0
        else:
            # Subtract this TO's salary values from accumulated WO totals
            wo.driver_salary = max(0, (wo.driver_salary or 0) - (to.driver_salary or 0))
            wo.allowance = max(0, (wo.allowance or 0) - (to.allowance or 0))
            wo.unit_price = max(0, (wo.unit_price or 0) - (to.unit_price or 0))

        # Reset TO: MATCHED->PENDING.
        if to.status in (TripOrderStatus.MATCHED, TripOrderStatus.COMPLETED):
            to.status = TripOrderStatus.PENDING
        to.is_locked = False
        to.unlink_work_order(int(wo.id))  # type: ignore[arg-type]

        await self.wo_repo.save(wo)
        await self.to_repo.save(to)

        return to, wo
