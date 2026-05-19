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

# ── Delivered Trips (formerly Work Orders) ────────────────────────

allow(user, "create", "DeliveredTrip") if role_allow(user, "driver");
allow(user, "batch_create", "DeliveredTrip") if role_allow(user, "driver");
allow(user, "read", "DeliveredTrip") if role_allow(user, "driver");
allow(user, "read_list", "DeliveredTrip") if role_allow(user, "driver");
allow(user, "update", "DeliveredTrip") if role_allow(user, "accountant");
allow(user, "export", "DeliveredTrip") if role_allow(user, "accountant");
allow(user, "cancel", "DeliveredTrip") if role_allow(user, "accountant");

# ── Booked Trips (formerly Trip Orders) ──────────────────────────

allow(user, "create", "BookedTrip") if role_allow(user, "accountant");
allow(user, "read", "BookedTrip") if role_allow(user, "driver");
allow(user, "read_list", "BookedTrip") if role_allow(user, "driver");
allow(user, "update", "BookedTrip") if role_allow(user, "accountant");
allow(user, "cancel", "BookedTrip") if role_allow(user, "accountant");
allow(user, "confirm", "BookedTrip") if role_allow(user, "accountant");
allow(user, "import", "BookedTrip") if role_allow(user, "accountant");
allow(user, "export", "BookedTrip") if role_allow(user, "accountant");
allow(user, "download_template", "BookedTrip") if role_allow(user, "accountant");

# ── Reconciliation ────────────────────────────────────────────────

allow(user, "reconcile", "Reconciliation") if role_allow(user, "accountant");
allow(user, "unmatch", "Reconciliation") if role_allow(user, "accountant");
allow(user, "suggest", "Reconciliation") if role_allow(user, "accountant");
allow(user, "upload", "Reconciliation") if role_allow(user, "accountant");
allow(user, "export", "Reconciliation") if role_allow(user, "accountant");

# ── Partners (unified clients + vendors) ──────────────────────────

allow(user, "read", "Partner") if role_allow(user, "driver");
allow(user, "read_list", "Partner") if role_allow(user, "driver");
allow(user, "create", "Partner") if role_allow(user, "accountant");
allow(user, "update", "Partner") if role_allow(user, "accountant");
allow(user, "delete", "Partner") if role_allow(user, "accountant");

# ── Locations ─────────────────────────────────────────────────────

allow(user, "read", "Location") if role_allow(user, "driver");
allow(user, "create", "Location") if role_allow(user, "accountant");
allow(user, "update", "Location") if role_allow(user, "accountant");
allow(user, "delete", "Location") if role_allow(user, "accountant");

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
allow(user, "read_own_salary", "Salary") if role_allow(user, "driver");

# ── Salary Config ─────────────────────────────────────────────────

allow(user, "read", "SalaryConfig") if role_allow(user, "driver");
allow(user, "update", "SalaryConfig") if role_allow(user, "accountant");

# ── Users ─────────────────────────────────────────────────────────

allow(user, "read", "User") if role_allow(user, "accountant");
allow(user, "read_list", "User") if role_allow(user, "accountant");
allow(user, "list", "User") if role_allow(user, "accountant");
allow(user, "create", "User") if role_allow(user, "accountant");
allow(user, "update", "User") if role_allow(user, "accountant");
allow(user, "delete", "User") if role_allow(user, "director");

# ── Audit ─────────────────────────────────────────────────────────

allow(user, "read", "Audit") if role_allow(user, "accountant");

# ── Dashboard & Drivers — any authenticated user ──────────────────

allow(user, "create", "Driver") if role_allow(user, "accountant");
allow(user, "update", "Driver") if role_allow(user, "accountant");

allow(_user, "read", "Dashboard");
allow(_user, "read_list", "Driver");
