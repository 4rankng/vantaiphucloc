# Task 0105 — Add "Biển số xe" column to Người dùng page

## Scope
The `/accountant/settings/users` page (UserManagement.tsx) currently shows: Tên, Vai trò, SĐT.
Requirement: **Add a "Biển số xe" column** that shows the vehicle plate for driver-role users.

The backend already has the concept of vehicles linked to drivers via `Vehicle.driver_id` and `Vehicle.plate` (see `fleet/interface/routers/drivers.py` for how plates are loaded). The user list endpoint returns users but does NOT include vehicle plate data.

## Technical Implementation

### Backend
1. **`backend/app/contexts/identity/interface/routers/users.py`** (or wherever `GET /users` is defined):
   - In the user list endpoint, for each user with `role='driver'`, join with `Vehicle` table to get the active plate.
   - Add `vehicle_plate: str | None` field to the user response schema.
   - Use a similar pattern to `drivers.py` lines 64-76: batch-load plates via a single query `SELECT driver_id, plate FROM vehicles WHERE driver_id IN (...)` rather than N+1.

2. **Update response DTO** to include `vehicle_plate: str | None = None`.

### Frontend
3. **`frontend/src/hooks/use-queries.ts`** — Update `UserAccount` type to include `vehiclePlate?: string | null`.

4. **`frontend/src/pages/director/UserManagement.tsx`**:
   - Add a new column `{ key: 'plate', header: 'Biển số xe', accessor: u => u.role === 'driver' ? (u.vehiclePlate ? <span className="font-mono text-xs">{u.vehiclePlate}</span> : '—') : '' }` 
   - Place it after the SĐT column
   - Also update the mobile card view to show plate for drivers (after phone/CCCD line)

## Testing Criteria
- [ ] `GET /users` response includes `vehicle_plate` for driver users, `null` for non-drivers
- [ ] `/accountant/settings/users` table shows "Biển số xe" column with plate for drivers
- [ ] Non-driver users show empty/dash in the plate column
- [ ] Mobile card view shows plate for drivers
