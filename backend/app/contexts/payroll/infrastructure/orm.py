"""ORM re-exports for Payroll."""

from __future__ import annotations

from app.models.domain import Setting as SettingORM
from app.models.domain import WorkOrder as WorkOrderORM

__all__ = ["SettingORM", "WorkOrderORM"]
