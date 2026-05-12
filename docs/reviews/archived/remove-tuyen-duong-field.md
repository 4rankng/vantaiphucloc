# Remove "Tuyến đường" Field Everywhere — Pending Task Spec
**Date:** 2026-05-12
**For:** Next SWE pickup
**Priority:** P1
**Effort:** ~1-2 dev-days

## Problem
Trip + Order entities có field "Tuyến đường" (route text) redundant với (Điểm lấy + Điểm trả). User confirmed: route managed entirely from (from, to) combo. Remove field everywhere.

## Scope

### Match algorithm (HIGH)
- Remove "tuyen_duong" / "route" entry khỏi criteria array
- max_score: 6 → 5
- Update response shape

### Forms (HIGH)
- Form Tạo chuyến (driver app + admin tạo chuyến nếu có): remove "Tuyến đường" input
- Form Tạo đơn hàng (kế toán): remove "Tuyến đường" input
- Auto-derive route từ (from, to) trong display

### Display (HIGH)
- Trip card (list views, detail views)
- Order card
- Anywhere "Tuyến đường" được render → replace với `<from> → <to>` computed inline

### API response (MED)
- Strip `route` / `tuyen_duong` field khỏi Trip + Order response DTOs
- Frontend rely on `from_location` + `to_location` đã có

### DB migration (LOW — defer with explicit user OK)
- Drop column `route_text` / `tuyen_duong` từ `trips`, `orders` tables
- Migration: `XXX_drop_route_text_columns.up.sql`
- Backfill check: existing rows có values significantly different từ `from + → + to` không? Sample 10-20 rows.

## Tasks Checklist
- [ ] **T-001** [P0]: Remove from match criteria backend
- [ ] **T-002** [P0]: Update score denominator backend
- [ ] **T-003** [P0]: Remove UI row frontend comparison panel
- [ ] **T-004** [P0]: Update score badge frontend (X/5 thay vì X/6)
- [ ] **T-005** [P0]: Remove input từ form Tạo chuyến
- [ ] **T-006** [P0]: Remove input từ form Tạo đơn hàng
- [ ] **T-007** [P1]: Find all `route` / `tuyen_duong` display refs, replace với computed `from → to`
- [ ] **T-008** [P1]: Strip field khỏi API DTOs
- [ ] **T-009** [P2-DEFER]: DB migration drop column (user approval required)

## Acceptance Criteria
- [ ] Forms không có "Tuyến đường" input
- [ ] Match comparison có 5 criteria (Ngày đi / Khách hàng / Điểm lấy / Điểm trả / Container)
- [ ] Score format X/5 everywhere
- [ ] Display chỗ nào hiện "Tuyến đường" → giờ hiện "<from> → <to>" computed
- [ ] No regressions: ketoan vẫn ghép được, taixe vẫn create chuyến

## Files Likely Changed
- Frontend: `MatchDetailPanel.tsx`, `MatchSuggestionList.tsx`, `CreateTrip*.tsx`, `CreateOrder*.tsx`, trip/order card components
- Backend: match algorithm service, Trip + Order entities, DTOs, response serializers
