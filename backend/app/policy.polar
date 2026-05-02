# Oso authorization policy for Vận tải Phúc Lộc
# Single source of truth for all permission rules.

# ── Role hierarchy ────────────────────────────────────────────────
# superadmin → accountant → driver (inherits lower)
# superadmin → director → accountant → driver
# Each rule only needs to declare the MINIMUM role; higher roles inherit.

role_allow(user, _role) if user.role = "superadmin";
role_allow(user, role) if user.role = role;
role_allow(user, "accountant") if user.role = "director";
role_allow(user, "driver") if user.role = "director";
role_allow(user, "driver") if user.role = "accountant";

# ── Work Orders ───────────────────────────────────────────────────

allow(user, "create", "WorkOrder") if role_allow(user, "driver");
allow(user, "batch_create", "WorkOrder") if role_allow(user, "driver");
allow(user, "read", "WorkOrder") if role_allow(user, "driver");
allow(user, "read_list", "WorkOrder") if role_allow(user, "driver");
allow(user, "update", "WorkOrder") if role_allow(user, "accountant");
allow(user, "export", "WorkOrder") if role_allow(user, "accountant");
allow(user, "cancel", "WorkOrder") if role_allow(user, "accountant");
allow(user, "cancel", work_order) if
    role_allow(user, "driver") and user.id = work_order.driver_id;

# ── Trip Orders ───────────────────────────────────────────────────

allow(user, "create", "TripOrder") if role_allow(user, "accountant");
allow(user, "read", "TripOrder") if role_allow(user, "driver");
allow(user, "read_list", "TripOrder") if role_allow(user, "driver");
allow(user, "update", "TripOrder") if role_allow(user, "accountant");
allow(user, "cancel", "TripOrder") if role_allow(user, "accountant");
allow(user, "confirm", "TripOrder") if role_allow(user, "accountant");
allow(user, "import", "TripOrder") if role_allow(user, "accountant");
allow(user, "export", "TripOrder") if role_allow(user, "accountant");
allow(user, "download_template", "TripOrder") if role_allow(user, "accountant");

# ── Reconciliation ────────────────────────────────────────────────

allow(user, "reconcile", "Reconciliation") if role_allow(user, "accountant");
allow(user, "unmatch", "Reconciliation") if role_allow(user, "accountant");
allow(user, "suggest", "Reconciliation") if role_allow(user, "accountant");
allow(user, "upload", "Reconciliation") if role_allow(user, "accountant");
allow(user, "export", "Reconciliation") if role_allow(user, "accountant");

# ── Clients ───────────────────────────────────────────────────────

allow(user, "read", "Client") if role_allow(user, "driver");
allow(user, "read_list", "Client") if role_allow(user, "driver");
allow(user, "create", "Client") if role_allow(user, "accountant");
allow(user, "update", "Client") if role_allow(user, "accountant");
allow(user, "delete", "Client") if role_allow(user, "accountant");

# ── Routes ────────────────────────────────────────────────────────

allow(user, "read", "Route") if role_allow(user, "driver");
allow(user, "read_list", "Route") if role_allow(user, "driver");
allow(user, "create", "Route") if role_allow(user, "accountant");
allow(user, "update", "Route") if role_allow(user, "accountant");
allow(user, "delete", "Route") if role_allow(user, "accountant");

# ── Pricings ──────────────────────────────────────────────────────

allow(user, "read", "Pricing") if role_allow(user, "driver");
allow(user, "read_list", "Pricing") if role_allow(user, "driver");
allow(user, "create", "Pricing") if role_allow(user, "accountant");
allow(user, "update", "Pricing") if role_allow(user, "accountant");
allow(user, "delete", "Pricing") if role_allow(user, "accountant");

# ── Salary ────────────────────────────────────────────────────────

allow(user, "calculate", "Salary") if role_allow(user, "accountant");
allow(user, "read", "Salary") if role_allow(user, "accountant");
allow(user, "read_list", "Salary") if role_allow(user, "accountant");
allow(user, "dashboard", "Salary") if role_allow(user, "accountant");
allow(user, "update", "Salary") if role_allow(user, "accountant");
allow(user, "export", "Salary") if role_allow(user, "accountant");

# driver can read own salary periods
allow(user, "read_own_salary", "Salary") if user.role = "driver";

# ── Salary Config ─────────────────────────────────────────────────

allow(user, "read", "SalaryConfig") if role_allow(user, "driver");
allow(user, "update", "SalaryConfig") if role_allow(user, "accountant");

# ── Users ─────────────────────────────────────────────────────────

allow(user, "list", "User") if role_allow(user, "director");
allow(user, "create", "User") if role_allow(user, "director");
allow(user, "update", "User") if role_allow(user, "director");
allow(user, "delete", "User") if role_allow(user, "director");

# ── Vendors ───────────────────────────────────────────────────────

allow(user, "read", "Vendor") if role_allow(user, "driver");
allow(user, "read_list", "Vendor") if role_allow(user, "driver");
allow(user, "create", "Vendor") if role_allow(user, "accountant");
allow(user, "update", "Vendor") if role_allow(user, "accountant");
allow(user, "delete", "Vendor") if role_allow(user, "accountant");

# ── Audit ─────────────────────────────────────────────────────────

allow(user, "read", "Audit") if role_allow(user, "accountant");

# ── Dashboard & Drivers — any authenticated user ──────────────────

allow(_user, "read", "Dashboard");
allow(_user, "read_list", "Driver");
