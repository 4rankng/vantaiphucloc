# Split Multi-Container Orders to Separate Rows in Ghép — Pending Task Spec
**Date:** 2026-05-12
**For:** Next SWE pickup
**Priority:** P1
**Effort:** ~1-1.5 dev-days

## Problem
1 đơn hàng có thể có nhiều containers. Hiện trên trang `/accountant/work-orders` các containers join vào 1 row với " · " separator, khiến match 1↔1 với chuyến (chuyến chỉ chở 1 container) khó scan + khó ghép độc lập.

**Example current:**
- Container row: `E20 OOLU7774229` (chuyến) ↔ `F20 CMAU2422633 · F20 HLXU9647849` (đơn hàng — 2 containers)

**Desired:**
- 1 đơn hàng 2 containers → render thành **2 entries** trong "Đơn hàng có thể ghép" list, mỗi entry có Ghép button riêng

## Scope

### Backend (preferred Option B — backend pre-expands)
- Endpoint `GET /api/v1/work-orders/:tripId/candidates`: return 1 entry per `(order × container)` tuple thay vì 1 per order
- Match score compute per (trip, order, container)
- Confirm match endpoint accept `(trip_id, order_id, container_id)`

### Frontend
- Render mỗi entry as 1 row
- Header card show specific container badge per row
- Ghép button submit `container_id` riêng

## Tasks Checklist
- [ ] **T-001** [P0]: Backend endpoint expand containers
- [ ] **T-002** [P0]: Backend match score per container compute
- [ ] **T-003** [P0]: Confirm match endpoint accept container_id
- [ ] **T-004** [P0]: Frontend render flat list (no grouping by order)
- [ ] **T-005** [P0]: Frontend container badge per entry header
- [ ] **T-006** [P0]: Frontend submit container_id in match confirm
- [ ] **T-007** [P1]: Test edge case — single-container orders still work normally

## Acceptance Criteria
- [ ] 1 đơn hàng 2 containers → list show 2 entries
- [ ] Mỗi entry có Ghép button riêng
- [ ] Click Ghép entry 1 → chỉ container 1 link với chuyến
- [ ] Container 2 vẫn available trong candidates list cho chuyến khác
- [ ] No regression: 1 đơn hàng 1 container vẫn render 1 row

## DB Schema Notes
- KHÔNG change schema. `containers` vẫn 1-to-many với `orders`
- `trip_order_matches` (hoặc tương đương) cần có `container_id` column riêng
- Existing matches without `container_id` → backfill từ order's first container, hoặc leave NULL với migration sau

## Files Likely Changed
- Backend: match candidates query + DTO, confirm match service
- Frontend: `MatchSuggestionList.tsx`, `MatchDetailPanel.tsx`, type definitions
