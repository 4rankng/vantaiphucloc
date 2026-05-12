# Driver Auto-Fill Personalization — Pending Tasks Spec

**Date:** 2026-05-12
**For:** Next SWE pickup
**Owner:** TBD
**Priority:** P1 (UX improvement, not blocking)

---

## Problem Statement

Driver "Tạo chuyến đi" page (route: `/driver/work-orders/new`) renders a section labeled **"KHÁCH & TUYẾN · TỰ ĐỘNG ĐIỀN"** with up to 5 quick-pick chips representing recent `(client, route_from, route_to)` tuples. User reports the same 5 chips (HAIAN / PAN / HAP / HAIAN / NEWWAY) appear identical across multiple drivers, which suggests either (a) seeded test data overlaps heavily, or (b) the current algorithm doesn't differentiate enough per driver.

Goal: make this section meaningfully personal to each driver based on **(1) their actual usage frequency over past 90 days** and **(2) optional GPS re-rank at the moment they tap "Tạo chuyến"** (on-demand only — NO continuous tracking).

---

## Current State (verified 2026-05-12)

**Frontend rendering:**
- Section markup: `frontend/src/pages/driver/CreateWorkOrder.tsx:175-192`
- Reusable chip list: `frontend/src/components/shared/RecentTripSuggestions/` (renders `WorkOrder[]` props, shows `partner.code || partner.name` + `pickup → dropoff`)

**Frontend data source:**
- Hook: `frontend/src/pages/driver/useCreateWorkOrder.ts:93-116`
- Logic today:
  1. Calls `apiClient.getWorkOrders({ driverId: user.id })` — returns ALL of this driver's work orders (paginated).
  2. Client-side sort by `createdAt` DESC.
  3. Client-side dedup keyed on `${partner.id}-${pickupLocation.id}-${dropoffLocation.id}`.
  4. Take first 5 unique tuples.
- ❗ Algorithm is **recency-only**, not frequency-weighted. A driver who ran HAIAN twice yesterday but PAN 50 times last month will see HAIAN at the top.
- ❗ Brand-new drivers see an empty list (no global fallback).
- ❗ No GPS / location awareness.
- ❗ Loads the entire driver work-order history client-side just to extract 5 tuples — wasteful at scale.

**Backend endpoint used today:**
- `GET /work-orders?driver_id={id}` — `backend/app/contexts/operations/interface/routers/work_orders.py:245-275`
- Generic paginated list, not optimized for "top-N popular routes per driver".

**Locations schema (good news for Phase 2):**
- `backend/app/models/domain.py:82-102` — `Location` ORM **already has `lat: Float`, `lng: Float` columns** and an index `ix_locations_lat_lng`. ✅ **No schema migration needed.** Only data backfill required.

---

## Phase 1 — Frequency-Based Personalization (SHIP FIRST)

### Goal

Replace the client-side recency-only dedup with a server-side, frequency-weighted endpoint that returns the top N=5 `(client, route_from, route_to)` tuples for the current logged-in driver over the past 90 days. Fall back to global-popular routes when the driver has < 5 distinct personal tuples.

### Backend Tasks

- [ ] **P1-BE-001** [P0]: New endpoint `GET /api/v1/drivers/me/auto-fill-routes?limit=5`
  - Auth: required, role=`driver`. Uses `current_user.id` (no `driver_id` query param exposed; admin tooling can use a separate variant later).
  - Query: aggregate over `work_orders` table for current driver, last 90 days, excluding cancelled.
    ```sql
    SELECT
      partner_id,
      pickup_location_id,
      dropoff_location_id,
      COUNT(*) AS usage_count,
      MAX(created_at) AS last_used_at
    FROM work_orders
    WHERE driver_id = :me
      AND status <> 'cancelled'
      AND created_at >= NOW() - INTERVAL '90 days'
    GROUP BY partner_id, pickup_location_id, dropoff_location_id
    ORDER BY usage_count DESC, last_used_at DESC
    LIMIT :limit;
    ```
  - Response shape:
    ```json
    [
      {
        "client_id": 42,
        "client_name": "Công ty TNHH HAP",
        "client_code": "HAP",
        "pickup_location_id": 7,
        "pickup_location_name": "Cát Lái",
        "dropoff_location_id": 19,
        "dropoff_location_name": "Bình Dương",
        "source": "personal",
        "last_used_at": "2026-05-10T08:30:00Z",
        "usage_count": 23
      }
    ]
    ```
  - File: new router under `backend/app/contexts/operations/interface/routers/auto_fill.py` (or extend `work_orders.py`).
  - Use case under `backend/app/contexts/operations/application/use_cases/`.

- [ ] **P1-BE-002** [P0]: Fallback to global-popular routes
  - If personal result count < `limit`, top up with global top routes (same aggregation but no `driver_id` filter, exclude tuples already in personal result).
  - Mark fallback rows with `source: "popular"`.

- [ ] **P1-BE-003** [P1]: Caching
  - Cache per-driver result for 5 minutes (Redis key `auto_fill:driver:{id}` or in-memory LRU).
  - Bust on new work order creation for that driver (or rely on TTL — acceptable for v1).

- [ ] **P1-BE-004** [P2]: Click-through tracking (optional — improves quality over time)
  - Log `auto_fill_click` events (driver_id, picked tuple, position) to a lightweight table or log stream.
  - Not required for v1, but useful for later analytics / A-B.

### Frontend Tasks

- [ ] **P1-FE-001** [P0]: New hook `useDriverAutoFillRoutes()`
  - File: `frontend/src/hooks/use-driver-auto-fill-routes.ts` (new).
  - React-query, `queryKey: ['driver', 'auto-fill-routes']`, `staleTime: 5 min`.
  - Returns `{ data, isLoading, error }` typed as `AutoFillRoute[]`.

- [ ] **P1-FE-002** [P0]: Wire new hook into Create Work Order page
  - File: `frontend/src/pages/driver/useCreateWorkOrder.ts:93-116`
  - Replace the existing `apiClient.getWorkOrders({ driverId })` block + client-side dedup with `useDriverAutoFillRoutes()`.
  - Adapt `recentOrders` shape (or rename / introduce a new `autoFillRoutes` field) and update consumer in `CreateWorkOrder.tsx:188-192`.
  - `RecentTripSuggestions` component (`frontend/src/components/shared/RecentTripSuggestions/`) will need an adjusted prop type — either keep accepting `WorkOrder[]` and have the hook map back, OR refactor to accept the new `AutoFillRoute[]` shape directly. Prefer the latter for clarity.

- [ ] **P1-FE-003** [P0]: Loading skeleton
  - 3–5 chip-shaped placeholders while `isLoading`.
  - Reuse `frontend/src/components/atoms/Skeleton.tsx` if it exists; otherwise inline a shimmer div with `bg-[var(--theme-bg-secondary)]`.

- [ ] **P1-FE-004** [P1]: Source badges
  - Subtle "Quen thuộc" label for `source: "personal"` items.
  - Subtle "Phổ biến" label for `source: "popular"` fallback items.
  - Styling: 10px text, `text-muted` color, not bold.

- [ ] **P1-FE-005** [P1]: Empty state
  - If endpoint returns `[]` (no personal AND no global routes — very unlikely): show
    > "Sau chuyến đầu tiên, app sẽ tự động đề xuất tuyến quen"
  - Just text, no chip frames.

### Testing — Phase 1

- [ ] **P1-TEST-001** [P0]: Integration test — two drivers with different histories return different top-5.
  - File: `tests/integration/test_driver_auto_fill.py` (new).
  - Seed driver A with 10 HAIAN trips + 2 HAP, driver B with 8 PAN + 1 HAIAN. Hit endpoint as each → assert ordering.

- [ ] **P1-TEST-002** [P1]: Edge case — brand-new driver (0 trips) → returns global top 5 with `source: "popular"`.

- [ ] **P1-TEST-003** [P1]: Edge case — driver with only 2 personal tuples → returns 2 personal + 3 popular, dedup correct.

### Acceptance Criteria — Phase 1

- [ ] Logging in as two seeded driver accounts shows two visibly different chip lists in the "Khách & Tuyến · Tự động điền" section.
- [ ] A brand-new driver sees 5 global popular chips with the "Phổ biến" badge.
- [ ] Clicking a chip still fills client + pickup + dropoff fields (no regression vs. today's `handleRecentTripSelect`).
- [ ] `pnpm lint && pnpm type-check && pnpm test` clean.
- [ ] Backend `pytest` clean, including new `test_driver_auto_fill.py`.
- [ ] Manual: open DevTools network tab, confirm only one `/api/v1/drivers/me/auto-fill-routes` request fires (no more full work-order list pull just for suggestions).

---

## Phase 2 — GPS Re-Rank On-Demand (FOLLOW-UP)

### Goal

When a driver taps "Tạo chuyến đi", request a **one-time** GPS reading. Use it to re-rank the Phase 1 list so routes whose `pickup_location` is geographically near the driver's current position bubble to the top. **Strictly no continuous tracking.** Permission must be requested fresh per session (or per N hours) with the exact copy below.

### UX Flow

1. Driver taps "Tạo chuyến đi" FAB on `DriverHome` → navigates to Create Work Order page.
2. On page mount, if browser geolocation permission is not yet granted (or last-denied >24h ago), display permission prompt with the **EXACT** wording:
   > **"Tạm thời bật để đóng dấu chuyến vận chuyển này"**
3. User grants → call `navigator.geolocation.getCurrentPosition()` with `{ enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }`.
4. Pass `lat` & `lng` as query params to the Phase 1 endpoint.
5. Backend computes Haversine distance from GPS to each candidate route's `pickup_location` (using the existing `Location.lat/lng` columns).
6. Re-rank rule:
   - Routes with `distance_km < 5` → promoted to top, sorted by `distance_km` ASC.
   - Routes with `distance_km ≥ 5` (or unknown lat/lng) → preserve Phase 1 ranking, placed below the GPS-promoted bucket.
7. If GPS is within `<500m` of one `Location.lat/lng`, backend additionally returns a separate `auto_pickup_suggestion: { location_id, name, distance_m }` payload — frontend shows a confirm icon (✓) on the "Điểm lấy" field with a tap-to-accept affordance.
8. Edge cases:
   - User denies permission → silent fallback to Phase 1 frequency-only.
   - GPS timeout / unavailable → silent fallback.
   - GPS far (>20km) from all known pickup locations → no re-rank, no banner, Phase 1 order preserved.

### Backend Tasks

- [ ] **P2-BE-001** [P0]: Schema check — **NO migration needed**, `Location.lat`/`Location.lng` already exist (verified at `backend/app/models/domain.py:88-89` + index at `:102`).

- [ ] **P2-BE-002** [P0]: Backfill lat/lng for existing `locations` rows.
  - One-time admin script: `backend/scripts/backfill_location_coords.py`.
  - Use Google Maps Geocoding API (paid, more accurate for VN addresses) **or** Nominatim (free, OpenStreetMap, rate-limited 1 req/sec).
  - Strategy: for each `Location` with `lat IS NULL`, build query string from `name + address` and call geocoder. Persist result; log failures for ketoán to manually correct.
  - Recommend Google Maps because Vietnamese address normalization is non-trivial — but check if billing is already enabled / budget exists before committing.

- [ ] **P2-BE-003** [P0]: Extend `GET /api/v1/drivers/me/auto-fill-routes` from Phase 1 to accept optional `lat: float` and `lng: float` query params.
  - When both present: compute Haversine distance server-side for each candidate's pickup location (skip rows where `pickup.lat IS NULL` — keep them in their original Phase 1 position).
  - Add `distance_km: float | null` to each response item.
  - Apply re-rank rule from UX flow step 6.

- [ ] **P2-BE-004** [P1]: Auto-pickup detection.
  - If any `Location` (across the whole table, not just candidate pickups) is within 500m of the GPS coords, return a top-level field:
    ```json
    {
      "routes": [...],
      "auto_pickup_suggestion": {
        "location_id": 7,
        "name": "Cát Lái",
        "distance_m": 312
      }
    }
    ```
  - Note: this changes the endpoint response from a list to an object — coordinate the breaking change with FE; bump the route version or always wrap (`{ routes, auto_pickup_suggestion: null }`).

### Frontend Tasks

- [ ] **P2-FE-001** [P0]: Geolocation permission prompt component.
  - File: `frontend/src/components/shared/GpsPermissionPrompt/GpsPermissionPrompt.tsx` (new).
  - Copy (do NOT change): **"Tạm thời bật để đóng dấu chuyến vận chuyển này"**.
  - Persist user decision in `localStorage` keyed `gps_perm_decision`: `"granted" | "denied:<ISO timestamp>"`. If denied, re-prompt allowed after 24h.
  - Two buttons: "Bật" (calls `getCurrentPosition`) / "Bỏ qua" (sets denied + closes).

- [ ] **P2-FE-002** [P0]: GPS fetch with timeout.
  - `navigator.geolocation.getCurrentPosition(success, error, { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 })`.
  - On success: pass `lat`, `lng` to `useDriverAutoFillRoutes(lat, lng)`.
  - On error/timeout: call hook without coords (Phase 1 fallback).

- [ ] **P2-FE-003** [P0]: Update `useDriverAutoFillRoutes()` signature to accept optional `(lat?, lng?)` args and include them in the queryKey + request URL.

- [ ] **P2-FE-004** [P1]: "Gần bạn" badge on chips where `distance_km < 5`, suffix with `· 2.3 km` for clarity.

- [ ] **P2-FE-005** [P1]: Auto-pickup confirm UI on "Điểm lấy" field.
  - When backend returns `auto_pickup_suggestion`, show a small ✓ confirm pill above/inside the field: "Bạn đang ở [Cát Lái] — tap để chọn".
  - Tapping calls `setPickupLocation(name)`.
  - Dismissible.

- [ ] **P2-FE-006** [P1]: Graceful degradation — verify no toast/error appears when permission is denied or GPS fails. Section silently shows Phase 1 list.

### Testing — Phase 2

- [ ] **P2-TEST-001** [P0]: Mock GPS coords at Cát Lái → routes from Cát Lái rank top in response.
- [ ] **P2-TEST-002** [P0]: Mock GPS far from all known locations → Phase 1 order preserved, no errors.
- [ ] **P2-TEST-003** [P1]: Permission denied path — Phase 1 endpoint called without lat/lng, response is the same as pure Phase 1.
- [ ] **P2-TEST-004** [P1]: Auto-pickup — GPS within 300m of a `Location` → response includes `auto_pickup_suggestion`.

### Acceptance Criteria — Phase 2

- [ ] On a fresh device, navigating to Create Work Order shows the GPS permission prompt with the exact required copy (Vietnamese spell-check verified).
- [ ] Granting permission → routes nearest current GPS bubble to top, marked "Gần bạn · X.X km".
- [ ] Denying permission → Phase 1 list renders normally with no error, no console warnings.
- [ ] Within 500m of a known location → the "Điểm lấy" field shows a confirm pill that auto-fills the location name on tap.
- [ ] No background geolocation, no `watchPosition`, no continuous tracking anywhere in the diff (`grep watchPosition` returns nothing new).

---

## Risks / Open Questions

- ⚠️ **Geocoding accuracy for VN addresses.** Plan a manual review step by ketoán after the backfill script runs — surface a "Locations missing coords" admin view (could be P3 follow-up).
- ⚠️ **Geocoding API cost.** Google Maps Geocoding API charges per request. Nominatim is free but rate-limited 1 req/s and has weaker VN coverage. Decide before P2-BE-002.
- ⚠️ **Privacy / labor law.** Verify VN labor regulation allows on-demand GPS at user-initiated moment. Should be fine because this is explicit user-triggered, not passive tracking, but flag to legal/HR if uncertain.
- ⚠️ **Permission prompt fatigue.** Re-prompting after 24h on every Create Trip flow may annoy. Watch driver feedback after rollout; consider stretching to 7 days if friction is reported.
- ⚠️ **Cache invalidation in Phase 1.** 5-min TTL is acceptable but causes a small delay before a newly completed trip shows up in suggestions. If users complain, switch to invalidate-on-create.
- ⚠️ **Breaking API shape change in Phase 2.** Going from `AutoFillRoute[]` → `{ routes, auto_pickup_suggestion }` is breaking. Either version the endpoint (`/auto-fill-routes/v2`) or ship Phase 2 BE+FE in the same release.

---

## Effort Estimate

- **Phase 1:** ~1.5–2 dev-days (new endpoint + use case + frontend hook + UI badges + tests).
- **Phase 2:** ~3–4 dev-days (backfill script + geocoding setup + distance compute + GPS prompt component + UI badges + auto-pickup + edge cases).
- **Total:** ~5–6 dev-days, recommended to split across 2 sprints.

---

## Dependencies

- Phase 1 must ship before Phase 2 (Phase 2 extends Phase 1's endpoint).
- Phase 2 requires a geocoding provider decision + API key (`GOOGLE_MAPS_API_KEY` env var or Nominatim user-agent string).
- Phase 2 frontend depends on HTTPS context (geolocation API gated on secure origin) — confirm prod & staging both serve over HTTPS.

---

## Out of Scope (Defer)

- Continuous GPS tracking / geofencing / auto-prompts when driver enters a yard.
- Time-of-day pattern prediction ("Monday morning you usually do PAN").
- Multi-stop trip suggestions.
- ML-based ranking beyond simple frequency × recency × distance.
- Driver-facing settings UI to manage GPS permission state (revert to OS-level for now).

---

## Reference — Today's File Paths (verified 2026-05-12)

| Purpose | Path |
|---|---|
| Section markup (Khách & Tuyến · Tự động điền) | `frontend/src/pages/driver/CreateWorkOrder.tsx:175-192` |
| Chip list component | `frontend/src/components/shared/RecentTripSuggestions/` |
| Current data-fetch hook | `frontend/src/pages/driver/useCreateWorkOrder.ts:93-116` |
| Work-orders API client | `frontend/src/services/api/workOrders.api.ts:48` |
| Backend list endpoint (used today) | `backend/app/contexts/operations/interface/routers/work_orders.py:245-275` |
| Location ORM (already has lat/lng) | `backend/app/models/domain.py:82-102` |

---

**Document owner:** Hand off to next SWE cron — implement Phase 1 first, ship & verify in prod, then schedule Phase 2.
