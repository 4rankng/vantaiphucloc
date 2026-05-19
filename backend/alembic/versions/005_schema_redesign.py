"""Schema redesign: Partner, Vehicle, Reconciliation, Settings.

Revision ID: 005
Revises: 004
Create Date: 2026-05-11

- Create partners, vehicles, reconciliations, settings tables
- Migrate clients+vendors → partners
- Migrate users.tractor_plate → vehicles
- Migrate trip_order_work_orders → reconciliations
- Update FKs: client_id → partner_id on work_orders, trip_orders, pricings, templates
- Drop old tables: clients, vendors, routes, salary_periods, salary_period_configs, trip_order_work_orders
- Remove dead columns: route, earning, revenue, tractor_plate, is_confirmed, is_locked, etc.
"""

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    """Not reversible — clean-break migration."""
    raise NotImplementedError("This migration is not reversible (clean-break schema redesign)")
