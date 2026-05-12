"""Reconciliation use cases.

Bind a WorkOrder to a TripOrder (and vice versa). The link lives
in `reconciliations`. Domain rules:

  - A TripOrder has N containers and may match N WorkOrders (TO-centric).
  - A WorkOrder has 1 container and may match exactly 1 TripOrder.
  - Capacity check: len(matched WOs) <= TripOrder.containers.count
  - Pricing snapshots flow from TripOrder onto WorkOrder at match time;
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
      - WO.status = MATCHED (PENDING → MATCHED, only if not already)
      - TO.status = MATCHED (PENDING → MATCHED, stays MATCHED if already)
      - Pricing snapshot copied from TO to WO.

    TO-centric model: a TripOrder has N containers and may match N
    WorkOrders. A WorkOrder may only match one TripOrder.
    Capacity: len(matched WOs) must be <= len(TO.containers).
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
            count_links_for_to,
            work_order_has_link,
        )

        wo = await self.wo_repo.get_by_id(WorkOrderId(data.work_order_id))
        if wo is None:
            raise NotFound("WorkOrder", data.work_order_id)

        if not wo.containers:
            raise ReconciliationConflict(
                "Work order must have at least one container before matching"
            )

        to = await self.to_repo.get_by_id(TripOrderId(data.trip_order_id))
        if to is None:
            raise NotFound("TripOrder", data.trip_order_id)

        # WO must not already be matched to any TO (1:1 constraint)
        if await work_order_has_link(self.session, int(wo.id)):  # type: ignore[arg-type]
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
        if to.status not in (TripOrderStatus.PENDING, TripOrderStatus.MATCHED):
            raise ReconciliationConflict(
                f"Đơn hàng đang ở trạng thái {to.status}, không thể ghép"
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

        # TO transitions: PENDING → MATCHED (stays MATCHED if already)
        if to.status == TripOrderStatus.PENDING:
            to.match()
        to.link_work_order(int(wo.id), matched_by=data.user_id)  # type: ignore[arg-type]
        to.is_locked = True

        await self.wo_repo.save(wo)
        await self.to_repo.save(to)
        return to


class UnmatchTripFromWorkOrder:
    """Break a TO<->WO link. WO always goes back to PENDING (1:1).
    TO goes back to PENDING only if this was the last link (no more WOs)."""

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
            count_links_for_to,
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

        # WO always resets to PENDING (1:1 with TO)
        if wo.status == WorkOrderStatus.MATCHED:
            wo.unmatch()
        else:
            wo.status = WorkOrderStatus.PENDING
        wo.is_locked = False
        wo.driver_salary = 0
        wo.allowance = 0
        wo.unit_price = 0

        # Check remaining links for this TO
        remaining = await count_links_for_to(
            self.session, int(to.id)  # type: ignore[arg-type]
        )

        if remaining <= 1:
            # Last link removed — TO goes back to PENDING
            if to.status == TripOrderStatus.MATCHED:
                to.unmatch()
            else:
                to.status = TripOrderStatus.PENDING
            to.is_locked = False
        else:
            # Other WOs still linked — TO stays MATCHED
            pass

        to.unlink_work_order(int(wo.id))  # type: ignore[arg-type]

        await self.wo_repo.save(wo)
        await self.to_repo.save(to)

        return to, wo
