Act as a Senior QA Engineer. Your task is to comprehensively evaluate the functionality and usability of the logistics web application at https://phucloc.tingting.vip/ (currently test env). You are authorized to seed the database with any necessary test data to facilitate this testing.

Context & Resources:

Target URL: https://phucloc.tingting.vip/ (test env)
User Roles: SuperAdmin, Giam doc (Director), Ke toan (Accountant), Tai xe (Driver)
Test Data: Customer Excel files for creating don hang are located in `/Users/dev/Documents/projects/vantaiphucloc/docs/don-hang/`. Files include:
- `Phúc Lộc - Shipside T4.26 HAP.xlsx` — Invoice + CUOC pricing (4 sheets: "Bảng kê SS" = containers, "CUOC" = pricing catalog with volume tiers)
- `2.GLORY SHANGHAI- 2612N.xlsx` — Bay Plan
- `8.CONSCIENCE 2615N.xlsx` — Bay Plan
- `Loading list of HAIAN BETA 062S.xls` — Loading List (.xls format)

---

## TESTING CREDENTIALS

| Username  | Password  | Role       |
|-----------|-----------|------------|
| admin     | admin123  | SuperAdmin |
| giamdoc   | admin123  | Director   |
| ketoan    | admin123  | Accountant |
| taixe     | admin123  | Driver     |

---

## ROLE HIERARCHY

```
SuperAdmin -> inherits all roles (superadmin, director, accountant, driver)
Director   -> inherits (director, accountant, driver)
Accountant -> inherits (accountant, driver)
Driver     -> inherits (driver) only
```

---

## PREVIOUSLY FIXED (DO NOT RE-REPORT)

The following issues were fixed across QA rounds v6–v8. Verify they remain fixed but do NOT file new bugs for them unless they regress:

1. **Doanh thu column** — `/accountant/trips` shows real values (not 0 ₫). Verify still working.
2. **Director "Đã khớp" KPI** — Shows correct count (not 0). Verify still working.
3. **Filter chip vocabulary** — Both pages use "Chờ ghép" / "Đã khớp" (not "Chờ khớp"). Verify still working.
4. **Director navigation** — Uses horizontal NavStrip (not sidebar). Verify still working.
5. **Activity log copy** — Shows proper Vietnamese ("Kế toán đã ghép chuyến #1"). Verify still working.
6. **Auto-fill chips** — Clicking a chip fills Khách hàng, Điểm lấy, Điểm trả. Verify still working.
7. **Work order card routes** — Ghép chuyến shows routes (not "—"). Verify still working.
8. **Driver job detail route** — Shows "Cung đường: X → Y" (not "-"). Verify still working.
9. **Salary period display** — Kỳ lương shows correct period (e.g. "26/04 → 25/05"). Verify still working.
10. **Trip detail MATCHED badge** — Matched orders show single green "Đã khớp" chip (not duplicate "Đã huỷ"). Verify still working.
11. **Client "Loại" column** — Companies show "Công ty" (not "Cá nhân"). Verify still working.
12. **Driver earnings API** — `/api/v1/driver/earnings` returns 200 (not 403). Verify still working.
13. **Match "Tuyến đường"** — Match comparison shows route strings (not "—"). Verify still working.
14. **Work order route display** — Route text wraps to 2 lines (not truncated with "..."). Verify still working.
15. **Push subscription loop** — `POST /api/v1/push/subscriptions` fires once per session (not 4-5 times). Verify still working.

---

## FLOW 1: DRIVER (Tai xe) — Mobile-First User

The driver is a mobile-first user who creates work orders from the field, tracks own earnings, and pins new GPS locations.

### 1.1 Login
- Log in with driver credentials.
- Verify home screen loads with earnings summary and work order list.

### 1.2 View Home Dashboard
- Verify current salary period earnings summary displays correctly (total earnings, number of work orders).
- Verify work order list shows only the driver's own work orders.
- Verify salary fields (driver_salary, allowance) are hidden/zeroed for PENDING work orders.

### 1.3 Create Work Order (Tao chuyen)
- Navigate to Create Work Order page.
- Fill in: select partner/client, pickup location, dropoff location, container number, work type.
- **GPS Location Picker**: Test the nearby locations list populates based on GPS coordinates.
- **Container OCR**: Take a photo of a container -> verify OCR extracts the container number correctly.
- **Container Validation**: Verify ISO 6346 container number validation works (valid vs invalid numbers).
- Submit -> verify work order is created with status PENDING.
- Verify the new work order appears in the home list.

### 1.4 Edit Work Order
- Open an existing PENDING work order owned by the driver.
- Edit fields (e.g., change container number, update location).
- Save -> verify changes persist.
- Try editing a MATCHED work order -> verify it is not editable (or limited editing).

### 1.5 View Work Order Detail
- Open a work order detail page.
- Verify all fields display correctly: status, partner, route, container, pricing info, timestamps.
- Verify the back navigation works.

### 1.6 View History (Lich su)
- Navigate to History page.
- Verify past work orders display correctly with filters.
- Verify only the driver's own work orders are shown.

### 1.7 View Earnings
- Verify earnings display for the current salary period.
- Change period -> verify earnings recalculate correctly.
- Verify breakdown: base salary, allowances, deductions.

### 1.8 Pin New Location
- From the location picker, pin a new location using GPS.
- Verify the new location appears as a pending alias for accountant review.

### 1.9 Push Notifications
- Register device for push notifications.
- Verify VAPID public key is returned.
- Unregister device.

### 1.10 Profile
- View own profile -> verify all fields display.
- Update display name -> verify change persists.
- Change password -> verify old password is required, new password is accepted.

### 1.11 Cross-Driver Access (Security)
- Log in as driver A.
- Attempt to access driver B's work order by URL -> verify 404 is returned.
- Verify no salary/earnings data from other drivers is visible.

---

## FLOW 2: ACCOUNTANT (Ke toan) — Primary Operational User

The accountant is the main operational role: imports orders, manages pricing, matches work orders to trip orders, and handles billing.

### 2.1 Login & Dashboard
- Log in with accountant credentials.
- Verify dashboard loads with pending work order/trip order cards, stats, and quick actions.

### 2.2 Import Customer Orders (Nhap don hang tu Excel)
- Navigate to Import Orders page.
- Upload a customer Excel file.
- Verify the system parses and previews the data correctly.
- Commit the import -> verify Trip Orders are created.
- Verify duplicate detection works (re-importing same file).
- **Apply Pricing**: After import, apply pricing to unpriced trip orders -> verify pricing is matched by client + route.

### 2.3 Import Pricing (Nhap bang gia tu Excel)
- Navigate to Import Pricing page.
- Upload a pricing Excel file.
- Verify preview shows correct data.
- Commit -> verify pricing entries are created/updated.

### 2.4 Create Trip Order Manually
- Navigate to Create Trip page.
- Fill in: partner, origin, destination, container info, pricing, notes.
- Submit -> verify trip order is created with status DRAFT or PENDING.

### 2.5 Manage Trip Orders
- View trip order list with filters (partner, status, date, unpriced).
- Open a trip order detail -> verify all fields, including matched work orders.
- Edit a trip order -> verify changes persist.
- Cancel a trip order -> verify status changes to CANCELLED.

### 2.6 View & Match Work Orders (Doi soat tai xe)
- Navigate to Work Order list page.
- View all work orders (from all drivers) with filters (driver, date, status).
- **Suggest Matches**: For an unmatched work order, click "suggest matches" -> verify the system suggests compatible trip orders based on route, partner, container, etc.
- **Manual Match**: Select a suggested trip order and confirm the match -> verify work order status changes to MATCHED.
- **Unmatch**: Unmatch a previously matched work order -> verify status reverts to PENDING.
- **Auto-Match**: Trigger auto-match -> verify system auto-matches work orders to trip orders (score >= 1.0 auto-confirms).
- **Bulk Match**: Trigger bulk match -> verify only 6/6 score matches are auto-confirmed.
- Verify match score chips display correctly in the master list.

### 2.7 Match Trip to Work Orders (Ghep chuyen)
- From a trip order detail, initiate match flow.
- View suggested work orders for this trip.
- Select and confirm match(es) -> verify trip order is linked to work order(s).

### 2.8 Manage Partners (Doi tac)
- Navigate to Partners page.
- Create a new client -> verify creation.
- Create a new vendor -> verify creation.
- Create a partner that is both client and vendor.
- Edit partner details -> verify changes persist.
- Delete a partner -> verify deletion (or restriction if partner has linked orders).

### 2.9 Manage Pricing (Bang gia)
- Navigate to Pricing page.
- View pricing list.
- Create a new pricing entry (client + route + work type + price).
- Edit pricing -> verify change.
- Delete pricing -> verify deletion.
- View client-specific pricing detail page.

### 2.10 Manage Locations & Routes (Cung duong)
- Navigate to Routes page.
- View all locations/routes.
- Create a new location.
- Edit a location.
- Delete a location (or verify restriction if location has linked orders).

### 2.11 Manage Location Aliases
- View pending location aliases (submitted by drivers via GPS pin).
- **Confirm** an alias -> verify it is linked to the canonical location.
- **Reject** an alias -> verify rejection reason can be provided.
- **Reopen** a rejected alias.
- **Merge** two locations -> verify all references update to the canonical location.

### 2.12 Salary Period Setup (Thiet lap ky luong)
- Navigate to Salary Setup page.
- View current salary period configuration (from_day, to_day).
- Update salary period dates -> verify change persists.
- View driver earnings for a period.
- Export salary report -> verify Excel download works.

### 2.13 Customer Settlement Report
- Navigate to Customer Settlement Report page.
- Select filters (client, date range).
- Generate report -> verify Excel download contains correct data.
- Verify report includes: trip orders, matched work orders, pricing, totals.

### 2.14 Export Work Orders
- From work order list, trigger Excel export.
- Verify download contains all visible work orders with correct data.

### 2.15 Export Trip Orders
- From trip order list, trigger Excel export.
- Verify download contains all visible trip orders with correct data.

### 2.16 Notifications
- View notifications page.
- Verify notifications display correctly (new work orders, matches, system alerts).

### 2.17 Settings
- Navigate to Settings hub.
- Verify nested settings pages: Salary, Pricing, Clients, Vendors, Users, Drivers.
- Manage users from settings (create, update — no delete for accountant).

### 2.18 Audit Logs
- Verify accountant can access audit logs.
- Verify logs show recent actions (create, update, delete, match operations).

### 2.19 OCR Container Number
- Upload a container photo via the OCR endpoint.
- Verify the extracted container number is correct.
- Verify ISO 6346 validation of the extracted number.

---

## FLOW 3: DIRECTOR (Giam doc) — Oversight & Management

The director has high-level oversight: views KPIs, drills down into per-driver and per-client details, manages users, and can perform all accountant actions.

### 3.1 Login & Dashboard
- Log in with director credentials.
- Verify dashboard loads with KPI widgets: monthly revenue, trip counts, expense, bar chart.
- Verify recent trips list displays correctly.
- Verify audit log section shows recent system actions.

### 3.2 KPI Dashboard Verification
- Verify monthly revenue figure matches sum of completed trip orders.
- Verify trip count stats (total, by status breakdown).
- Verify bar chart renders correctly (trips or revenue by period).
- Verify all KPIs update when new data is created (by accountant or driver).

### 3.3 User Management (Quan ly tai khoan)
- Navigate to User Management page.
- View user list -> verify all users EXCEPT superadmin are visible.
- Create a new user (any role except superadmin).
- Edit user details.
- **Delete** a user -> verify deletion.
- **Cannot promote to superadmin**: Try promoting a user to superadmin -> verify the system rejects it.

### 3.4 View Partners
- Navigate to Partners page.
- Verify partner list displays correctly (read-only for director).

### 3.5 View Routes
- Navigate to Routes page.
- Verify route/location list displays correctly.

### 3.6 View Pricing
- Navigate to Pricing page.
- View pricing list.
- View client-specific pricing detail.

### 3.7 View Trips
- Navigate to Trip list.
- View all trip orders with filters.
- Open trip detail -> verify full detail including matched work orders.

### 3.8 Create Trip Order
- Navigate to Create Trip page.
- Create a trip order -> verify creation (director inherits accountant permissions).

### 3.9 View Notifications
- Navigate to Notifications page.
- Verify notifications display correctly.

### 3.10 Drill-Down: Driver Jobs
- From dashboard or user list, click on a driver.
- Verify driver jobs page shows all work orders for that driver.
- Verify work order details, status, and earnings breakdown.

### 3.11 Drill-Down: Client Jobs
- From dashboard or partner list, click on a client.
- Verify client jobs page shows all trip orders for that client.
- Verify trip order details, matching status, and totals.

### 3.12 Profile
- View and edit own profile.

### 3.13 Director Cannot See SuperAdmin
- Log in as director.
- Navigate to User Management.
- Verify no superadmin accounts appear in the user list.

---

## FLOW 4: SUPERADMIN — System Administrator

The superadmin is the god-role with full access to everything, including all accountant/director/driver flows plus user management of all roles.

### 4.1 Login & Dashboard
- Log in with superadmin credentials.
- Verify dashboard loads (minimal — home page only).

### 4.2 User Management (Full)
- Navigate to User Management.
- View ALL users including other superadmins.
- Create users with any role INCLUDING superadmin.
- Edit any user.
- Delete any user (except self? verify behavior).

### 4.3 Access All Accountant Flows
- Verify superadmin can access all import endpoints (customer Excel, pricing).
- Verify superadmin can access reconciliation/matching.
- Verify superadmin can access salary setup and export.
- Verify superadmin can access customer settlement reports.
- Verify superadmin can manage partners, pricing, locations, aliases.

### 4.4 Access All Director Flows
- Verify superadmin can view KPI dashboard.
- Verify superadmin can drill down into driver/client jobs.
- Verify superadmin can view audit logs.

### 4.5 Access All Driver Flows
- Verify superadmin can create work orders (though typically would not).

---

## OPEN ISSUES — FOCUS TESTING AREAS

These are known issues that have NOT been fixed yet. Test each one carefully and report if still present.

### OPEN-01 — Manual Ghép allows low-confidence matches with no confirmation (High)
**Flow:** Kế toán — Ghép chuyến
**Issue:** Clicking "Ghép" on a 2/6 score match succeeds instantly with no confirm dialog. No warning about mismatched fields, no free-text reason logged.
**Test:** Match a work order to a trip order with score 2/6 or 3/6 → verify no confirm dialog appears.
**Expected:** A confirm dialog should appear when score < 5/6, listing mismatched fields and requiring a reason.

### OPEN-02 — No manual fallback when 0 candidates suggested (High)
**Flow:** Kế toán — Ghép chuyến
**Issue:** When a work order has 0 candidate trip orders, the accountant has no way to browse all orders, search by container, or cross-month pick. They must give up.
**Test:** Find a work order that shows 0 candidates → verify there is no "Ghép thủ công" or search option.
**Expected:** A "Tìm đơn hàng" search box should allow browsing all trip orders by container number or PO.

### OPEN-03 — Auto-match threshold unreachable with current data (Medium)
**Flow:** Kế toán — Ghép chuyến
**Issue:** Auto-match requires a 6/6 (1.0) score, but no pair of work orders and trip orders in the current data achieves this. Auto-match is effectively a no-op.
**Test:** Click "Tự động ghép" → verify 0 pairs matched → verify no feedback toast about why.
**Expected:** Either lower the threshold or seed data with some perfect matches. Also, auto-match should always show a toast ("Đã ghép {n} cặp" — even if n=0).

### OPEN-04 — No location alias management UI (High)
**Flow:** Kế toán — Settings + Ghép chuyến
**Issue:** The backend has a `location_aliases` table with PENDING/MATCHED statuses, and the match suggester uses aliases for location comparison. But there is NO UI anywhere to review and confirm PENDING aliases. Aliases accumulate as PENDING and are never considered equivalent for auto-matching.
**Test:** Search for any alias management page → verify none exists.
**Expected:** A "Địa điểm & bí danh" page under Settings listing PENDING aliases with confirm/reject actions.

### OPEN-05 — Container validation inconsistency between Excel import and driver form (Medium)
**Flow:** Kế toán import vs Tài xế Tạo chuyến
**Issue:** The driver form validates ISO 6346 check digits strictly. If Excel import doesn't validate the same way, orders with invalid container numbers can be imported but drivers can never type the same number to match them.
**Test:** Note a container number from a trip order → try typing it in the driver Tạo chuyến form → verify if it's accepted or rejected.
**Expected:** Both paths should use the same validation (either both strict or both lenient).

### OPEN-06 — Excel import default-date lacks time (Low)
**Flow:** Kế toán — Nhập đơn hàng
**Issue:** The default-date input on the import modal is a plain `<input type="date">` with no time component. No per-row date override is available.
**Test:** Open the import modal → verify the date input is `type="date"` with no time selector.
**Expected:** At minimum a datetime-local input; ideally per-row date override.

### OPEN-07 — "Chờ ghép" badge clipped behind sibling card (Low)
**Flow:** Tài xế — Lịch sử
**Issue:** When two trip cards sit side-by-side, the orange "Chờ ghép" badge on the right card is partially hidden behind the left card. Text becomes "Chờ" with the rest cropped.
**Test:** Login as taixe → History → look for a row with two cards side-by-side → check badge clipping.
**Expected:** Badge fully visible, no overlap.

---

## FLOW 2A: EXCEL UPLOAD PARSING (Kế toán — Nhập đơn hàng)

Tests the import pipeline against each real customer file in `/Users/dev/Documents/projects/vantaiphucloc/docs/don-hang/`.

**Precondition:** Log in as ketoan. Ensure the target partner exists before uploading. Clear any previous test imports for the target partner.

### 2A.1 Upload "Phúc Lộc - Shipside T4.26 HAP.xlsx" (Invoice pattern)
- Navigate to Nhập đơn hàng từ Excel page.
- Select the partner for Phúc Lộc (HAP).
- Set default trip date to 2026-04-26.
- Upload `docs/don-hang/Phúc Lộc - Shipside T4.26 HAP.xlsx`.
- **Expected:** Pattern detector identifies the "Bảng kê SS" sheet. Preview shows parsed container rows with container numbers, work type (H/R → F/E + size), pickup/dropoff locations, trip date.
- **Verify:** The CUOC sheet should NOT be selected as the data sheet.
- **Edge case:** Rows with no pickup/dropoff should still be accepted with empty strings.

### 2A.2 Upload "2.GLORY SHANGHAI- 2612N.xlsx" (Bay Plan pattern)
- Upload `docs/don-hang/2.GLORY SHANGHAI- 2612N.xlsx`.
- **Expected:** Pattern detector identifies the bay-plan sheet (3+ Container header columns at regular intervals). Multiple containers from different port sections extracted with correct dropoff ports. F/E lookup from System Export sheet if present. Pickup defaults to "HAIPHONG".
- **Verify:** Vessel name extracted from filename ("GLORY SHANGHAI").

### 2A.3 Upload "8.CONSCIENCE 2615N.xlsx" (Bay Plan pattern)
- Upload `docs/don-hang/8.CONSCIENCE 2615N.xlsx`.
- **Expected:** Same bay-plan extraction as 2A.2. Vessel name = "CONSCIENCE" from filename.
- **Verify:** No duplicate containers across port sections. Deduplication by container number is applied.

### 2A.4 Upload "Loading list of HAIAN BETA 062S.xls" (Loading List pattern)
- Upload `docs/don-hang/Loading list of HAIAN BETA 062S.xls`.
- **Expected:** Pattern detector identifies loading-list format. Preview shows containers with pickup from "Port of Loading", dropoff from POD column, work type from F/E and SIZE columns.
- **Verify:** `.xls` format (old Excel) is handled correctly.
- **Edge case:** No phantom rows after the real data terminates.

### 2A.5 Re-upload (Idempotency)
- After committing rows from any file above, re-upload and commit the same file.
- **Expected:** `skipped_duplicates` equals the number of previously committed containers. `created` = 0. No duplicate TripOrders.
- **Verify:** Idempotency key is `(partner_id, trip_date, container_number)`.

### 2A.6 AI Fallback
- Upload a file with no recognizable pattern or standard headers.
- **Expected:** Generic pipeline fails → AI extractor invoked. If AI succeeds, rows appear in preview. If AI also fails, user gets "Không thể đọc tệp. Vui lòng nhập thủ công."

---

## FLOW 2B: CONTAINER-PER-ROW VERIFICATION (Kế toán)

Tests that each Excel row produces exactly one container entry with correct data.

### 2B.1 Container count matches row count
- Upload and preview any of the 4 Excel files.
- Count the accepted rows in preview. Commit the import.
- Query the API: `GET /api/v1/trip-orders?partner_id={id}` for newly created trips.
- **Expected:** Sum of `TripOrderContainer` records across all new TripOrders equals the accepted row count.
- **Verify:** Each container number appears exactly once in the database.

### 2B.2 Per-container data integrity
- Open a TripOrder created from import.
- **Verify each container has:**
  - `container_number` = normalized (uppercase, no hyphens) value from Excel
  - `work_type` = computed from F/E + size (e.g., F20, E40)
  - `container_size` = "20" or "40"
  - `freight_kind` = "F" or "E"
  - `gross_weight_kg` = weight value if present, else null
  - `seal_no` = seal number if present
- **Edge case:** If a row has no pickup/dropoff but the group has them, the container inherits the group's resolved locations.

### 2B.3 Container validation consistency (regression for OPEN-05)
- Import a file with a container number that has a bad ISO 6346 check digit.
- **Expected:** Import pipeline accepts it (does NOT enforce check digit).
- Log in as taixe. Try to create a WorkOrder with the same container number.
- **Expected:** Driver form accepts the same container number. If rejected, report as regression of OPEN-05.

---

## FLOW 2C: MULTI-CONTAINER TRIP MATCHING (Kế toán + Tài xế)

Tests the `group_rows_into_trips()` logic and match suggester with multi-container scenarios.

### 2C.1 Grouped import: 2 containers → 1 TripOrder
- **Setup:** Create test data where 2 Excel rows have the same `tractor_plate` (e.g., "30A-12345"), same `trip_date`, same `dropoff_location`, but different container numbers (two 20ft empties).
- Upload and commit.
- **Expected:** Commit response shows `grouped_trips >= 1`.
- **Verify:** One TripOrder with exactly 2 containers. Both share `trip_date`, `pickup_location_id`, `dropoff_location_id`. Status is PENDING. `unit_price = 0`.

### 2C.2 Ungrouped import: 2 containers → 2 separate TripOrders
- **Setup:** 2 Excel rows with NO `tractor_plate`, NO `customer_ref`, different container numbers, same date and route.
- Upload and commit.
- **Expected:** Two separate TripOrders (1 container each). `grouped_trips = 0`.
- **Verify:** Each TripOrder has exactly 1 container. They share the same route but are independent records.

### 2C.3 Match WorkOrder (2 containers) to grouped TripOrder (2 containers)
- **Precondition:** A TripOrder with 2 containers exists (from 2C.1).
- **Driver:** Creates a WorkOrder with 2 matching containers on the same route and partner.
- **Accountant:** Opens the WorkOrder, clicks "suggest matches".
- **Expected:** The grouped TripOrder appears as a high-score candidate.
- Confirm the match.
- **Verify:** WorkOrder → MATCHED. TripOrder → MATCHED/COMPLETED. `Reconciliation` record created.

### 2C.4 Match WorkOrder (2 containers) to 2 separate TripOrders — USABILITY ISSUE
- **Precondition:** Two separate TripOrders exist (from 2C.2), each with 1 container.
- **Driver:** Creates a WorkOrder with 2 containers (both container numbers match the two TripOrders).
- **Accountant:** Opens the WorkOrder, clicks "suggest matches".
- **Expected to find:** Both TripOrders appear as candidates (container number overlap).
- **Try to match both:** Attempt to match the WorkOrder to the first TripOrder, then to the second.
- **Expected result:** The second match is BLOCKED — the system enforces 1:1 matching.
- **REPORT AS USABILITY ISSUE:** The system should allow **1:N matching** (one WorkOrder matching multiple TripOrders). When a driver's trip carries 2 containers but the customer's orders were imported as 2 separate TripOrders (1 container each), the accountant should be able to link the single WorkOrder to both TripOrders. Recommend updating the `Reconciliation` model to support 1:N by removing the per-WO uniqueness constraint and allowing multiple active `Reconciliation` rows for the same `work_order_id`.

### 2C.5 Grouping signal precedence
- Upload a file where some rows have `tractor_plate` and others have only `customer_ref`.
- **Expected:**
  - Rows with `tractor_plate` group by `(trip_date, dropoff, plate)`.
  - Rows with only `customer_ref` group by `(trip_date, dropoff, ref)`.
  - Rows with neither are singletons.
- **Verify:** `grouped_trips` count reflects only rows actually grouped (2+ containers in one TripOrder).

### 2C.6 Mixed work_type in one group
- **Setup:** Two rows with same tractor_plate and trip_date, but one is F20 and the other is E40.
- Upload and commit.
- **Expected:** If the system groups them into one TripOrder despite different work_types, report as a bug. All containers in a TripOrder should share the same work_type.

---

## FLOW 2D: PRICING SCENARIOS (Kế toán — Bảng giá)

Tests tiered pricing lookup (`find_tiered_pricing`) and the apply-pricing flow.

### 2D.1 Per-container pricing (quantity=1)
- **Precondition:** A `Pricing` + `PricingLine(quantity=1, unit_price=297000)` exists for partner, work_type F20, route A→B.
- Import a TripOrder with 1 F20 container on route A→B.
- Apply pricing.
- **Expected:** `unit_price=297000`, `pricing_id` set, `driver_salary` and `allowance` set from PricingLine values.

### 2D.2 Quantity-based tiered pricing (quantity=2, twin-lift)
- **Precondition:**
  - `PricingLine(quantity=1, unit_price=297000)` for F20 route A→B.
  - `PricingLine(quantity=2, unit_price=350000)` for F20 route A→B.
- Import a TripOrder with 2 F20 containers on route A→B (grouped from 2 rows with same tractor_plate).
- Apply pricing.
- **Expected:** System calls `find_tiered_pricing` with `quantity=2`. TripOrder gets `unit_price=350000` (the quantity=2 tier), NOT 2 × 297000.
- **This is the core twin-lift pricing scenario** — 2 containers on one trip have a different price than 2 separate trips.

### 2D.3 Fallback to quantity=1 tier
- **Precondition:** Only `PricingLine(quantity=1, unit_price=297000)` exists for F20 route A→B. No quantity=2 tier.
- Import a TripOrder with 2 F20 containers on route A→B.
- Apply pricing.
- **Expected:** `find_tiered_pricing` falls back to quantity=1 tier. `unit_price=297000`.
- **Verify:** Fallback behavior should be surfaced as a warning or notification to the accountant.

### 2D.4 No pricing rule found
- Import a TripOrder for a route/work_type combo with no Pricing record.
- Apply pricing.
- **Expected:** TripOrder stays with `unit_price=0`. API response includes it in `not_found_trip_ids`.
- **Verify:** Accountant can manually set the price via trip detail UI.

### 2D.5 Per-trip vs per-container pricing display
- Open a TripOrder with 2 containers and `unit_price=350000`.
- **Expected:** Price displayed is the **per-trip** total (350,000), NOT per-container.
- **Verify:** Customer settlement report (Bảng kê SL) also shows trip-level price, not doubled.
- **Verify:** Salary calculation uses TripOrder's `unit_price`, not multiplied by container count.

### 2D.6 40-foot containers always quantity=1
- **Precondition:** `PricingLine(quantity=1, unit_price=345000)` for F40 route A→B.
- Import a TripOrder with 1 F40 container on route A→B.
- Apply pricing.
- **Expected:** `unit_price=345000`. 40-foot orders carry exactly 1 container, so quantity is always 1 for F40/E40.

---

## FLOW 2E: CUOC SHEET PRICING IMPORT (Kế toán — Nhập bảng giá)

Tests importing the pricing catalog from the HAP Excel file's CUOC sheet.

### 2E.1 Upload HAP file as pricing import
- Navigate to Nhập bảng giá từ Excel page.
- Select the HAP partner. Choose format "HAP" (or leave auto-detect — filename contains "HAP").
- Upload `docs/don-hang/Phúc Lộc - Shipside T4.26 HAP.xlsx`.
- **Expected:** `parse_hap_bytes` reads the CUOC sheet:
  - Route from column B (split on dash/en-dash for pickup/dropoff).
  - F20 price from column C, F40 from D, E20 from E, E40 from F.
  - One `TariffRow` per (route, work_type) where price > 0.
- **Verify:** Preview shows rows for all 4 work types on each route with non-zero prices.

### 2E.2 Commit CUOC pricing
- Review preview rows. Commit.
- **Expected:**
  - `pricings_created` = number of unique (pickup, dropoff, work_type) combos.
  - `lines_created` = matching count of `PricingLine(quantity=1)` rows.
- **Verify in DB:** For each unique route/work_type, a `Pricing` record exists with correct `partner_id`, `work_type`, `pickup_location_id`, `dropoff_location_id`, and a `PricingLine` with `unit_price` matching the CUOC value.

### 2E.3 Volume-based monthly tiers — MISSING FEATURE
- **Context:** The CUOC sheet contains a "GIÁ HỢP ĐỒNG" section with volume-based tiers:
  - Base: F20 = 297,000 / F40 = 345,000
  - 22-25 trips/month: +10% → 326,700 / 379,500
  - 25-28 trips: +15% → 341,550 / 396,750
  - 28-31 trips: +20% → 356,400 / 414,000
  - 31-34 trips: +25% → 371,250 / 431,250
  - Up to 49-52 trips: +55% → 460,350 / 534,750
- **Current behavior:** `parse_hap_bytes` only reads the standard rates from cols C-F. Volume tiers are NOT parsed or imported.
- **REPORT AS MISSING FEATURE:** The CUOC volume-based tier data is present in the Excel file but the system ignores it entirely. The import should parse the tier section and create `PricingLine` rows for each volume bracket, or the system should support monthly volume-based pricing adjustments.

### 2E.4 Special pricing: "5 cont vỏ/1 chuyến"
- **Context:** CUOC sheet mentions "Hải An – Lạch Huyện (5 cont vỏ/ 1 chuyến)" = 1,500,000 VND for 5 empty 40ft containers in one trip.
- **Test:** Manually create a `PricingLine(quantity=5, work_type=E40)` at 1,500,000. Then import 5 E20 containers on the same route with the same tractor_plate to create a grouped TripOrder.
- **Verify:** `find_tiered_pricing` with `quantity=5` resolves to this tier.
- **If the system does not support quantity > 2:** Report as missing feature — the tier system should support higher quantities for multi-container trips.

### 2E.5 Re-import CUOC (idempotency)
- Upload and commit the same CUOC file again.
- **Expected:** `pricings_existing` = previous `pricings_created`. `lines_existing` = previous `lines_created`. `lines_created` = 0.
- **With `update_existing_lines=true`:** If prices changed, verify existing PricingLine `unit_price` is updated.

### 2E.6 Location resolution in CUOC import
- **Context:** CUOC routes use Vietnamese names (e.g., "Hải An – Nam Hải, Đoạn Xá, TVN").
- **Expected:** Each `pickup_raw`/`dropoff_raw` is resolved via `LocationResolverService`:
  - Exact match → `match_kind = "exact"`.
  - Fuzzy match → `match_kind = "fuzzy"`, `review_needed = true`.
  - No match → new Location created.
- **Verify:** Preview `location_resolutions` correctly categorize each location string.

---

## CROSS-CUTTING FLOWS (Multi-Role)

### C1: End-to-End Order Lifecycle
1. **Accountant**: Import customer Excel -> Trip Orders created (status: PENDING).
2. **Driver**: Create Work Order from mobile (status: PENDING).
3. **Accountant**: Match Work Order to Trip Order -> both change to MATCHED.
4. **Director**: Verify dashboard KPIs reflect the new matched trip.
5. **Driver**: Verify work order now shows as MATCHED and earnings are updated.
6. **Accountant**: Export customer settlement report -> verify it includes the matched trip.

### C2: Location Aliasing Edge Cases
1. **Driver**: Pin a new location from GPS (e.g., "Hai Phong Port Gate 3").
2. **Accountant**: See pending alias in review queue.
3. **Accountant**: Confirm the alias maps to existing "Hai Phong" location.
4. **Verify**: Future work orders with "Hai Phong Port Gate 3" auto-resolve to "Hai Phong".
5. **Alternative**: Accountant merges two duplicate locations -> all historical references update.

### C3: Auto-Match with Location Aliases
1. **Accountant**: Create a Trip Order with origin "Hai Phong".
2. **Driver**: Create a Work Order with origin "HPH" (alias of Hai Phong).
3. **Accountant**: Trigger auto-match -> verify system uses alias mappings to match despite different names.
4. **If auto-match fails**: Accountant manually matches using "suggest matches" which should show the Trip Order despite the alias difference.

### C4: Salary Period Flow
1. **Accountant**: Configure salary period (e.g., from day 1 to day 15).
2. **Driver**: Complete multiple work orders within the period.
3. **Accountant**: View driver earnings for the period -> verify totals.
4. **Accountant**: Export salary report -> verify Excel contains correct period data.
5. **Director**: View dashboard -> verify salary expenses are reflected.

### C5: User Management Restrictions
1. **Director**: Try to create a superadmin user -> verify system rejects.
2. **Director**: View user list -> verify superadmin accounts are hidden.
3. **Accountant**: Try to delete a user -> verify system rejects (delete requires director level).
4. **SuperAdmin**: Create/edit/delete any user including superadmins.

### C6: Work Order Status Lifecycle
1. **Driver**: Create work order -> status: PENDING.
2. **Accountant**: Match to trip order -> status: MATCHED.
3. **Driver**: Verify MATCHED work order shows earnings (salary fields now visible).
4. **Accountant**: Unmatch the work order -> status reverts to PENDING.
5. **Driver**: Verify earnings no longer show for this work order.

### C7: Trip Order Status Lifecycle
1. **Accountant**: Create/import trip order -> status: PENDING.
2. **Accountant**: Match to work order -> status: COMPLETED.
3. **Accountant**: Cancel a different unmatched trip order -> status: CANCELLED.

### C8: Notification Flow
1. **Driver**: Create a new work order.
2. **Accountant**: Verify notification appears for the new work order.
3. **Accountant**: Match the work order to a trip order.
4. **Director**: Verify notification appears for the match event.
5. **Driver**: Verify notification appears confirming the match.

### C9: Full Import → Pricing → Match → Export → KPI Cycle
1. **Accountant:** Import pricing from CUOC sheet (FLOW 2E.1). Verify `Pricing` + `PricingLine` rows exist.
2. **Accountant:** Import customer Excel (FLOW 2A.1). Verify TripOrders are created.
3. **Accountant:** Apply pricing to the imported trips (FLOW 2D.1/2D.2). Verify prices are filled.
4. **Driver:** Create a WorkOrder with matching container numbers and route.
5. **Accountant:** Match WorkOrder to TripOrder (FLOW 2C.3).
6. **Accountant:** Export customer settlement report. Verify the report includes the matched trips with correct pricing.
7. **Director:** Verify KPI dashboard shows the revenue from the matched trips.

### C10: Multi-Container Pricing Edge Case
1. **Accountant:** Create a Pricing with two tiers: `PricingLine(quantity=1, unit_price=297000)` and `PricingLine(quantity=2, unit_price=350000)` for F20 route A→B.
2. **Accountant:** Import two containers on route A→B as two SEPARATE TripOrders (no grouping signal).
3. **Accountant:** Apply pricing to both → each gets quantity=1 price (297,000 each). **Total: 594,000.**
4. **Accountant:** Import two containers on route A→B as ONE TripOrder (grouped by tractor_plate).
5. **Accountant:** Apply pricing → the single trip gets quantity=2 price (350,000). **Total: 350,000.**
6. **Verify:** The pricing difference (594,000 vs 350,000) correctly reflects the volume discount for twin-lift.
7. **Report as bug if:** Both scenarios produce the same total price.

---

## REQUIRED OUTPUT

Produce a structured list of issues categorized for the development team. For every item, use the following format:

Type: [Bug / Missing Feature / Usability Issue]
Layer: [Frontend / Backend / Both]
Affected Role/Flow: [e.g., Ke toan - Upload Don hang, Tai xe - Create Work Order, Director - KPI Dashboard]
Description: [Clear explanation of what went wrong or what is missing]
Severity: [High / Medium / Low]
