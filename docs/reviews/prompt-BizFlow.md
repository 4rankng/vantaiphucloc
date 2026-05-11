Act as a Senior QA Engineer. Your task is to comprehensively evaluate the functionality and usability of the logistics web application at https://phucloc.tingting.vip/ (currently test env). You are authorized to seed the database with any necessary test data to facilitate this testing.

Context & Resources:

Target URL: https://phucloc.tingting.vip/ (test env)
User Roles: SuperAdmin, Giam doc (Director), Ke toan (Accountant), Tai xe (Driver)
Test Data: Customer Excel files for creating don hang are located in /Users/dev/Documents/vantaiphucloc/docs/don-hang.

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

---

## REQUIRED OUTPUT

Produce a structured list of issues categorized for the development team. For every item, use the following format:

Type: [Bug / Missing Feature / Usability Issue]
Layer: [Frontend / Backend / Both]
Affected Role/Flow: [e.g., Ke toan - Upload Don hang, Tai xe - Create Work Order, Director - KPI Dashboard]
Description: [Clear explanation of what went wrong or what is missing]
Severity: [High / Medium / Low]
