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
    # ── 1. Create new tables ──────────────────────────────────────────────

    op.create_table(
        "partners",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(50), unique=True, nullable=True),
        sa.Column("name", sa.String(255), nullable=False, index=True),
        sa.Column("partner_type", sa.String(20), nullable=False),
        sa.Column("partner_role", sa.String(20), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("tax_code", sa.String(50), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("contact_person", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("plate", sa.String(20), nullable=False, unique=True),
        sa.Column("driver_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.String(500), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── 2. Migrate data (if old tables exist) ─────────────────────────────

    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing = insp.get_table_names()

    # Migrate clients → partners
    if "clients" in existing:
        conn.execute(sa.text("""
            INSERT INTO partners (code, name, partner_type, partner_role, phone, tax_code,
                                  address, contact_person, is_active, created_at, updated_at)
            SELECT code, name, 'client', 'shipping_line', phone, tax_code,
                   address, contact_person,
                   COALESCE(is_active, true), COALESCE(created_at, now()), COALESCE(updated_at, now())
            FROM clients
            ON CONFLICT DO NOTHING
        """))

    # Migrate vendors → partners (skip duplicate names)
    if "vendors" in existing:
        conn.execute(sa.text("""
            INSERT INTO partners (code, name, partner_type, partner_role, phone, tax_code,
                                  address, contact_person, is_active, created_at, updated_at)
            SELECT NULL, name, 'vendor', 'transport', phone, tax_code,
                   address, contact_person,
                   COALESCE(is_active, true), COALESCE(created_at, now()), COALESCE(updated_at, now())
            FROM vendors
            WHERE name NOT IN (SELECT name FROM partners)
            ON CONFLICT DO NOTHING
        """))

    # ── 3. Add partner_id to tables that had client_id ────────────────────

    def _add_col(table: str, col: sa.Column) -> None:
        cols = [c["name"] for c in insp.get_columns(table)] if table in existing else []
        if col.name not in cols:
            op.add_column(table, col)

    _add_col("work_orders", sa.Column("partner_id", sa.Integer, sa.ForeignKey("partners.id"), nullable=True))
    _add_col("work_orders", sa.Column("vehicle_id", sa.Integer, sa.ForeignKey("vehicles.id"), nullable=True))

    if "clients" in existing:
        conn.execute(sa.text("""
            UPDATE work_orders SET partner_id = p.id
            FROM partners p
            JOIN clients c ON c.name = p.name AND p.partner_type = 'client'
            WHERE work_orders.client_id = c.id
        """))

    _add_col("trip_orders", sa.Column("partner_id", sa.Integer, sa.ForeignKey("partners.id"), nullable=True))
    _add_col("trip_orders", sa.Column("pickup_raw", sa.String(500), nullable=True))
    _add_col("trip_orders", sa.Column("dropoff_raw", sa.String(500), nullable=True))
    _add_col("trip_orders", sa.Column("location_review_needed", sa.Boolean, nullable=False, server_default=sa.text("false")))

    if "clients" in existing:
        conn.execute(sa.text("""
            UPDATE trip_orders SET partner_id = p.id
            FROM partners p
            JOIN clients c ON c.name = p.name AND p.partner_type = 'client'
            WHERE trip_orders.client_id = c.id
        """))

    # pricings: add partner_id
    _add_col("pricings", sa.Column("partner_id", sa.Integer, sa.ForeignKey("partners.id"), nullable=True))

    if "clients" in existing:
        conn.execute(sa.text("""
            UPDATE pricings SET partner_id = p.id
            FROM partners p
            JOIN clients c ON c.name = p.name AND p.partner_type = 'client'
            WHERE pricings.client_id = c.id
        """))

    # customer_import_templates: add partner_id
    _add_col("customer_import_templates", sa.Column("partner_id", sa.Integer, sa.ForeignKey("partners.id", ondelete="CASCADE"), nullable=True))

    if "clients" in existing:
        conn.execute(sa.text("""
            UPDATE customer_import_templates SET partner_id = p.id
            FROM partners p
            JOIN clients c ON c.name = p.name AND p.partner_type = 'client'
            WHERE customer_import_templates.client_id = c.id
        """))

    # ── 4. Migrate tractor_plate → vehicles ───────────────────────────────

    if "users" in existing:
        user_cols = [c["name"] for c in insp.get_columns("users")]
        if "tractor_plate" in user_cols:
            conn.execute(sa.text("""
                INSERT INTO vehicles (plate, driver_id, is_active, created_at, updated_at)
                SELECT tractor_plate, id, true, now(), now()
                FROM users
                WHERE tractor_plate IS NOT NULL AND tractor_plate != ''
                ON CONFLICT (plate) DO NOTHING
            """))
            # Link work_orders to vehicles
            conn.execute(sa.text("""
                UPDATE work_orders SET vehicle_id = v.id
                FROM vehicles v
                JOIN users u ON u.id = v.driver_id
                WHERE work_orders.driver_id = u.id
            """))

    # ── 5. Create reconciliations and migrate ─────────────────────────────

    op.create_table(
        "reconciliations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("trip_order_id", sa.Integer, sa.ForeignKey("trip_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_order_id", sa.Integer, sa.ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("match_score", sa.Float, nullable=False, server_default=sa.text("1.0")),
        sa.Column("matched_by", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("matched_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("unmatched_by", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("unmatched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true"), index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("trip_order_id", "work_order_id", "is_active", name="uq_reconciliations_active"),
    )

    if "trip_order_work_orders" in existing:
        conn.execute(sa.text("""
            INSERT INTO reconciliations (trip_order_id, work_order_id, match_score, matched_by,
                                         matched_at, is_active, created_at)
            SELECT towo.trip_order_id, towo.work_order_id, 1.0, 1,
                   COALESCE(wo.created_at, now()), true, COALESCE(wo.created_at, now())
            FROM trip_order_work_orders towo
            JOIN work_orders wo ON wo.id = towo.work_order_id
            ON CONFLICT DO NOTHING
        """))

    # ── 6. Drop old columns ───────────────────────────────────────────────

    # work_orders: drop old columns
    wo_cols = [c["name"] for c in insp.get_columns("work_orders")] if "work_orders" in existing else []
    if "client_id" in wo_cols:
        op.drop_column("work_orders", "client_id")
    if "route" in wo_cols:
        op.drop_column("work_orders", "route")
    if "tractor_plate" in wo_cols:
        op.drop_column("work_orders", "tractor_plate")
    if "earning" in wo_cols:
        op.drop_column("work_orders", "earning")
    if "is_locked" in wo_cols:
        op.drop_column("work_orders", "is_locked")
    if "locked_at" in wo_cols:
        op.drop_column("work_orders", "locked_at")
    if "locked_by" in wo_cols:
        op.drop_column("work_orders", "locked_by")

    # trip_orders: drop old columns
    to_cols = [c["name"] for c in insp.get_columns("trip_orders")] if "trip_orders" in existing else []
    if "client_id" in to_cols:
        op.drop_column("trip_orders", "client_id")
    if "route" in to_cols:
        op.drop_column("trip_orders", "route")
    if "revenue" in to_cols:
        op.drop_column("trip_orders", "revenue")
    if "is_confirmed" in to_cols:
        op.drop_column("trip_orders", "is_confirmed")
    if "confirmed_by" in to_cols:
        op.drop_column("trip_orders", "confirmed_by")
    if "confirmed_at" in to_cols:
        op.drop_column("trip_orders", "confirmed_at")
    if "is_locked" in to_cols:
        op.drop_column("trip_orders", "is_locked")
    if "locked_at" in to_cols:
        op.drop_column("trip_orders", "locked_at")
    if "locked_by" in to_cols:
        op.drop_column("trip_orders", "locked_by")

    # pricings: drop client_id
    pr_cols = [c["name"] for c in insp.get_columns("pricings")] if "pricings" in existing else []
    if "client_id" in pr_cols:
        op.drop_column("pricings", "client_id")

    # customer_import_templates: drop client_id
    cit_cols = [c["name"] for c in insp.get_columns("customer_import_templates")] if "customer_import_templates" in existing else []
    if "client_id" in cit_cols:
        op.drop_column("customer_import_templates", "client_id")

    # users: drop tractor_plate, vendor
    if "users" in existing:
        u_cols = [c["name"] for c in insp.get_columns("users")]
        if "tractor_plate" in u_cols:
            op.drop_column("users", "tractor_plate")
        if "vendor" in u_cols:
            op.drop_column("users", "vendor")

    # ── 7. Drop old tables ────────────────────────────────────────────────

    for table in ("salary_period_configs", "salary_periods", "trip_order_work_orders",
                  "routes", "vendors", "clients"):
        if table in existing:
            op.drop_table(table)


def downgrade() -> None:
    """Not reversible — clean-break migration."""
    raise NotImplementedError("This migration is not reversible (clean-break schema redesign)")
