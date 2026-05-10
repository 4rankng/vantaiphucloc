"""FastAPI dependency wiring for the Operations context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.application import (
    ApplyPricingToTrips,
    BatchCreateWorkOrders,
    CreateTripOrder,
    CreateTripOrderFromImport,
    CreateWorkOrder,
    DeleteTripOrder,
    GetTripOrder,
    GetWorkOrder,
    ListTripOrders,
    ListWorkOrders,
    MatchTripToWorkOrder,
    UnmatchTripFromWorkOrder,
    UpdateTripOrder,
    UpdateWorkOrder,
)
from app.contexts.operations.domain.repositories import (
    TripOrderRepository,
    WorkOrderRepository,
)
from app.contexts.operations.infrastructure.repositories import (
    SqlTripOrderRepository,
    SqlWorkOrderRepository,
)
from app.database import get_db


# ── repositories ────────────────────────────────────────────────


def get_trip_order_repository(
    db: AsyncSession = Depends(get_db),
) -> TripOrderRepository:
    return SqlTripOrderRepository(db)


def get_work_order_repository(
    db: AsyncSession = Depends(get_db),
) -> WorkOrderRepository:
    return SqlWorkOrderRepository(db)


# ── trip_order use cases ────────────────────────────────────────


def get_get_trip_order(
    repo: TripOrderRepository = Depends(get_trip_order_repository),
) -> GetTripOrder:
    return GetTripOrder(repo)


def get_list_trip_orders(
    repo: TripOrderRepository = Depends(get_trip_order_repository),
) -> ListTripOrders:
    return ListTripOrders(repo)


def get_create_trip_order(
    repo: TripOrderRepository = Depends(get_trip_order_repository),
    wo_repo: WorkOrderRepository = Depends(get_work_order_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateTripOrder:
    return CreateTripOrder(repo, wo_repo, db)


def get_update_trip_order(
    repo: TripOrderRepository = Depends(get_trip_order_repository),
    wo_repo: WorkOrderRepository = Depends(get_work_order_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateTripOrder:
    return UpdateTripOrder(repo, wo_repo, db)


def get_delete_trip_order(
    repo: TripOrderRepository = Depends(get_trip_order_repository),
    db: AsyncSession = Depends(get_db),
) -> DeleteTripOrder:
    return DeleteTripOrder(repo, db)


def get_create_trip_order_from_import(
    repo: TripOrderRepository = Depends(get_trip_order_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateTripOrderFromImport:
    return CreateTripOrderFromImport(repo, db)


def get_apply_pricing_to_trips(
    db: AsyncSession = Depends(get_db),
) -> ApplyPricingToTrips:
    return ApplyPricingToTrips(db)


# ── work_order use cases ────────────────────────────────────────


def get_get_work_order(
    repo: WorkOrderRepository = Depends(get_work_order_repository),
) -> GetWorkOrder:
    return GetWorkOrder(repo)


def get_list_work_orders(
    repo: WorkOrderRepository = Depends(get_work_order_repository),
) -> ListWorkOrders:
    return ListWorkOrders(repo)


def get_create_work_order(
    repo: WorkOrderRepository = Depends(get_work_order_repository),
    db: AsyncSession = Depends(get_db),
) -> CreateWorkOrder:
    return CreateWorkOrder(repo, db)


def get_update_work_order(
    repo: WorkOrderRepository = Depends(get_work_order_repository),
    db: AsyncSession = Depends(get_db),
) -> UpdateWorkOrder:
    return UpdateWorkOrder(repo, db)


def get_batch_create_work_orders(
    repo: WorkOrderRepository = Depends(get_work_order_repository),
    db: AsyncSession = Depends(get_db),
) -> BatchCreateWorkOrders:
    return BatchCreateWorkOrders(repo, db)


# ── reconciliation use cases ────────────────────────────────────


def get_match_trip_to_work_order(
    to_repo: TripOrderRepository = Depends(get_trip_order_repository),
    wo_repo: WorkOrderRepository = Depends(get_work_order_repository),
    db: AsyncSession = Depends(get_db),
) -> MatchTripToWorkOrder:
    return MatchTripToWorkOrder(to_repo, wo_repo, db)


def get_unmatch_trip_from_work_order(
    to_repo: TripOrderRepository = Depends(get_trip_order_repository),
    wo_repo: WorkOrderRepository = Depends(get_work_order_repository),
    db: AsyncSession = Depends(get_db),
) -> UnmatchTripFromWorkOrder:
    return UnmatchTripFromWorkOrder(to_repo, wo_repo, db)
