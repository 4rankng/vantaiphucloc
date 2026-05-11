# Multi-Match Chuyến ↔ Đơn Hàng — Task List

**Date:** 2026-05-12
**Goal:** Cho phép 1 chuyến (WorkOrder) match với nhiều đơn hàng (TripOrder). Hỗ trợ unmatch từng đơn riêng lẻ, tính lương cộng dồn, và UI multi-select.
**Owner:** User sẽ tự code (review, polish, deploy)
**Estimated effort:** ~0.5–1 dev-day còn lại (core đã code xong ngày 2026-05-12)

---

## ⚠️ IMPORTANT — Tình trạng thực tế

**Core feature đã được triển khai trong nhánh `main`** qua các commits `9107b4b → fbfe576` ngày 2026-05-12 (tasks 0090–0098). Branch hiện ahead of `origin/main` 10 commits — **chưa push, chưa deploy.**

Tài liệu này được viết SAU khi research codebase. Phần lớn các BE/FE tasks điển hình của "chuyển 1:1 → 1:N" đã được làm. Task list dưới đây là **danh sách verify + polish + deploy + future-scope**, không phải from-scratch.

Nếu user muốn bản from-scratch (assume code chưa có gì), xem phần **Appendix A** ở cuối.

---

## Current State Summary (đã verify từ code)

### Domain / mô hình dữ liệu
- `WorkOrder` = "chuyến" (phiếu làm việc do tài xế tạo). File: `backend/app/contexts/operations/domain/entities.py:260`.
- `TripOrder` = "đơn hàng" (đơn của khách, import từ Excel). File: same, line 121.
- Link table: `reconciliations` (đã có sẵn từ migration `005_schema_redesign.py`). N:M ở schema level; có cột `is_active`, `match_score`, `matched_by`, `matched_at`, `unmatched_by`, `unmatched_at`, `reason`. Unique constraint: `(trip_order_id, work_order_id, is_active)` — file `backend/app/models/domain.py:316`.
- **Direction hiện tại:** 1 WO ↔ N TOs (tức là 1 "chuyến" match nhiều "đơn hàng"). Chiều ngược lại (1 TO → N WOs) vẫn bị block bởi `trip_order_has_link()` check ở `application/reconciliation.py:96`.

### Backend application layer (đã có)
- `MatchTripToWorkOrder` (`application/reconciliation.py:54`): bind 1 WO ↔ 1 TO. Cho phép gọi nhiều lần cho cùng WO + TOs khác nhau (WO.match() là idempotent; pricing snapshot accumulates).
- `UnmatchTripFromWorkOrder` (`application/reconciliation.py:121`): unmatch 1 link. Nếu vẫn còn link khác cho WO → chỉ trừ phần salary của TO đó; nếu là link cuối → reset WO về PENDING.
- `WorkOrder.apply_pricing_snapshot()` accumulates (`entities.py:324`): `unit_price`, `driver_salary`, `allowance` cộng dồn.
- `find_link()` (`infrastructure/link_queries.py:33`): dùng `scalars().first()` thay vì `scalar_one_or_none()` để không crash khi WO có nhiều links.
- `count_links_for_wo()`, `find_all_links_for_wo()`: helpers cho multi-link.
- `match_suggester.suggest_trip_matches()`: scoring theo container chưa được claim (excludes matched TOs).

### Backend API endpoints (đã có)
- `POST /api/v1/reconcile` — match 1 WO ↔ 1 TO (giữ lại cho back-compat / single-match).
- `POST /api/v1/reconcile/batch-for-wo` — match 1 WO ↔ N TOs trong 1 call (file `interface/routers/reconcile.py:136`).
- `POST /api/v1/reconcile/unmatch` — body bắt buộc cả `work_order_id` lẫn `trip_order_id`.
- `GET /api/v1/reconcile/links/{work_order_id}` — list tất cả TOs đã match với WO.
- `POST /api/v1/reconcile/auto-match` — auto match TẤT CẢ full-score TOs (loop qua `full_matches`, không chỉ top 1).
- `POST /api/v1/reconcile/bulk-match` — bulk match nhiều cặp.
- `GET /api/v1/suggest-matches/{work_order_id}`, `GET /api/v1/suggest-wos/{trip_order_id}`.

### Frontend (đã có)
- `frontend/src/hooks/use-match-trip.ts` — `selectedTripIds: number[]` (mảng), `toggleTripSelection`, `getTripMatchStatus(tripId): 'full' | 'partial' | 'none'`, `handleMatch()` gọi `batchReconcile.mutateAsync({ workOrderId, tripOrderIds })`.
- `frontend/src/pages/accountant/MatchTrip.tsx` — redesigned cho flow 1 WO → N TOs (pick 1 WO, checkbox-select N TOs). Hiển thị toast "Đã ghép N đơn hàng".
- `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx` — khi WO ở status MATCHED, panel show **list tất cả TOs đã match** kèm nút "Bỏ ghép" mỗi TO. Có confirm dialog kèm field "lý do".
- `frontend/src/pages/accountant/work-orders/WorkOrderMasterList.tsx` — badge `{matchedTripCount} ĐH` hiển thị khi WO có >1 TO đã match (file line 140-144).
- API client: `useBatchReconcileForWO`, `useUnmatch`, `useReconcile`, `useBulkMatch` đều có sẵn trong `hooks/use-queries`.
- Schema FE: `matched_trip_count` trên `WorkOrderOut`; `matched_work_order_ids: list[int]` trên `TripOrderOut`.

### Income / counters (đã có)
- `GetDriverEarnings` (`backend/app/contexts/payroll/application/use_cases.py:27`): `SUM(WorkOrder.driver_salary) WHERE status='MATCHED'`. Vì `apply_pricing_snapshot` cộng dồn, total earnings tự động phản ánh nhiều TOs.
- Counters "Chờ khớp" / "Đã khớp" dùng `WorkOrder.status` (PENDING | MATCHED), không phụ thuộc số link → đã đúng cho multi-match.

### Tests (đã có)
- `backend/tests/integration/test_multi_match_reconciliation.py` — 9 integration tests cover AC-1 → AC-7.
- Full suite: 167 passed, 0 regressions (per CLAUDE.md note).

---

## Design Decisions Needed (ask user before bất kỳ extension nào)

- [ ] **DECISION-001 (chiều ngược):** Có cần làm chiều **1 TO → N WOs** không? Hiện tại: 1 TO chỉ link 1 WO. Use case: 1 đơn hàng cần tách thành nhiều chuyến (split shipment). Nếu YES → cần bỏ check `trip_order_has_link` + UI cho TO side.
- [ ] **DECISION-002 (capacity validation):** Có muốn validate sum(containers of matched TOs) ≤ capacity của WO không? Hiện tại không validate — accountant tự chịu trách nhiệm. (Domain có rule per-WO: E40/F40 = 1 container, E20/F20 ≤ 2 containers, nhưng không kiểm soát ở level multi-match.)
- [ ] **DECISION-003 (partial-match status):** Có muốn thêm status "Khớp một phần" (`PARTIAL_MATCHED`) khi WO đã match < full capacity không? Hiện chỉ có binary PENDING | MATCHED. (Lưu ý: status enum được dùng ở nhiều nơi — counters, salary calc, audit log.)
- [ ] **DECISION-004 (income split per TO):** Driver earnings hiện tại = total accumulated salary. Có muốn breakdown per-TO trong UI driver/accountant không? Hiện chưa hiển thị split, chỉ hiển thị total.
- [ ] **DECISION-005 (legacy /match route):** `frontend/src/pages/accountant/MatchTrip.tsx` (route `/match/:tripId`) là page cũ. Flow chính hiện tại đã chuyển sang `WorkOrderMasterList` + `MatchDetailPanel`. Giữ legacy page hay deprecate?

---

## ✅ Verification & Deploy Tasks (priority cao nhất)

### Deploy
- [ ] **DEP-001 [P0]:** Push 10 commits ahead trong branch `main` lên origin.
  - Cmd: `cd /Users/dev/Documents/projects/vantaiphucloc && git push origin main`
- [ ] **DEP-002 [P0]:** Deploy lên môi trường thật.
  - Cmd: `make push-all && make deploy-all` (theo CLAUDE.md). **Lưu ý:** CLAUDE.md note rằng deploy đang pending từ commit `705d7eb` (QA v8) — multi-match commits còn mới hơn, vẫn chưa deploy.
- [ ] **DEP-003 [P0]:** Smoke test sau deploy: ghép 1 WO với 2 TOs trên prod, verify UI, sau đó unmatch 1 trong 2.

### Verification
- [ ] **VER-001 [P0]:** Chạy lại `pytest backend/tests/integration/test_multi_match_reconciliation.py -v` và confirm 9/9 pass trên CI hoặc local.
- [ ] **VER-002 [P0]:** Verify `find_link()` không còn crash `MultipleResultsFound` — case: cùng `trip_order_id`, 2 active rows (shouldn't happen do unique constraint, nhưng test edge case).
- [ ] **VER-003 [P1]:** Verify unique constraint `uq_reconciliations_active` trên DB prod: `\d+ reconciliations` trong psql, confirm tồn tại.
- [ ] **VER-004 [P1]:** Manual test trên staging:
  - Tạo 1 WO với 2 containers
  - Tạo 3 TOs (mỗi TO 1 container, 1 trong số đó cont number không khớp WO)
  - Vào `WorkOrderMasterList`, chọn WO, panel suggest matches phải hiển thị 2 TOs có khớp container
  - Tick cả 2, "Ghép tất cả" → confirm WO chuyển MATCHED, badge "2 ĐH" hiển thị
  - Unmatch 1 TO → WO vẫn MATCHED (vì còn 1 link), badge chuyển còn 1
  - Unmatch nốt TO còn lại → WO về PENDING, salary về 0

---

## 🧹 Polish & Cleanup Tasks

### Backend
- [ ] **BE-CLEAN-001 [P1]:** Trong `reconcile.py` endpoint `reconcile` (line 113-124), có dead code `pass # salary calculated on-the-fly` — xoá hoặc thêm comment giải thích tại sao kept.
- [ ] **BE-CLEAN-002 [P2]:** `POST /api/v1/reconcile` (single 1:1) còn tồn tại — quyết định: deprecate sau N weeks hay keep song song với `batch-for-wo`. Nếu deprecate, thêm warning header `X-Deprecated: use /reconcile/batch-for-wo` và set timeline.
- [ ] **BE-CLEAN-003 [P2]:** Audit log: hiện có 4 action types riêng (`MATCH`, `BATCH_MATCH_WO`, `AUTO_MATCH`, `BULK_MATCH`) — đảm bảo dashboard audit log filter / display hợp lý cho cả 4.
- [ ] **BE-CLEAN-004 [P2]:** `match_suggester.suggest_wo_matches()` (dành cho chiều TO → WOs gợi ý) — verify còn dùng không. Nếu DECISION-001 = no, có thể remove endpoint `/suggest-wos/{trip_order_id}`.
- [ ] **BE-CLEAN-005 [P2]:** Logging: bổ sung log line cho `batch-for-wo` summarize số TOs success/fail (hiện tại loop chỉ log từng cái).

### Frontend
- [ ] **FE-CLEAN-001 [P1]:** `frontend/src/pages/accountant/MatchTrip.tsx` (route `/match/:tripId`) đã được refactor cho multi-select, nhưng entry point từ đâu vào? Confirm route còn được sử dụng hay đã orphan. Nếu orphan → xoá.
- [ ] **FE-CLEAN-002 [P1]:** `use-match-trip.ts` line 162: `suggestions: [] as unknown[]` — placeholder, không dùng. Xoá khỏi return type.
- [ ] **FE-CLEAN-003 [P2]:** Empty state cho `MatchDetailPanel` khi `matchedTrips.length === 0` đang show loading spinner (`Đang tải thông tin đơn hàng...`) — nhưng nếu thực sự không có matched trip, nên show "Chưa có đơn hàng nào — link bị thiếu". Hiện tại logic chỉ xảy ra trong race condition.
- [ ] **FE-CLEAN-004 [P2]:** Toast message "Đã ghép {N} đơn hàng" — có pluralization phù hợp tiếng Việt không cần thay đổi (TV không có số nhiều), nhưng kiểm tra trường hợp N=0 (không nên gọi `handleMatch`).
- [ ] **FE-CLEAN-005 [P2]:** `MatchDetailPanel` line 30: `useTripOrders(isMatched || manualSearchOpen ? undefined : undefined)` — biểu thức luôn ra `undefined`. Code smell — chắc là leftover refactor. Đơn giản hoá.
- [ ] **FE-CLEAN-006 [P2]:** `WorkOrderMasterList.tsx` line 140-144: badge `{matchedTripCount} ĐH` chỉ hiển thị khi > 1 — có muốn show cả khi = 1 không (để consistent)? Hỏi accountant.

### Docs
- [ ] **DOC-001 [P1]:** Cập nhật `BizLogic.md` mô tả quy tắc multi-match: "1 chuyến có thể được ghép với nhiều đơn hàng cùng partner, cùng route".
- [ ] **DOC-002 [P1]:** Cập nhật `CLAUDE.md` section "Architecture Patterns" — hiện đã có note ngày 2026-05-12 nhưng có thể bổ sung sơ đồ relationship.
- [ ] **DOC-003 [P2]:** Tạo `docs/don-hang/multi-match-flow.md` (vẽ flow ASCII hoặc Mermaid) cho dev mới nắm.
- [ ] **DOC-004 [P2]:** API docs trong FastAPI Swagger — verify `batch-for-wo` có example body đầy đủ.

---

## 🧪 Test Gaps

- [ ] **TEST-001 [P1]:** Frontend test cho `MatchDetailPanel` (matched mode hiển thị list, unmatch button, confirm dialog) — hiện chưa thấy.
- [ ] **TEST-002 [P1]:** Frontend test cho `use-match-trip` hook — `toggleTripSelection`, `getTripMatchStatus`, `handleMatch` flow.
- [ ] **TEST-003 [P1]:** E2E (Playwright) test happy path: accountant login → mở work-orders → select WO → tick 2 TOs → "Ghép tất cả" → verify badge → unmatch 1 → verify badge cập nhật.
- [ ] **TEST-004 [P2]:** Concurrent test: 2 accountants cùng match 1 TO vào 2 WO khác nhau — TO unique constraint nên bên thứ hai fail. Verify error UX.
- [ ] **TEST-005 [P2]:** Performance test: WO match với 10 TOs — assert response time < 2s.

---

## 🚀 Future Extensions (sau khi DECISION rõ)

### Nếu DECISION-001 = YES (1 TO → N WOs)
- [ ] **EXT-001 [P1]:** Bỏ check `trip_order_has_link` trong `MatchTripToWorkOrder.__call__` — cho phép 1 TO link nhiều WOs.
- [ ] **EXT-002 [P1]:** UI: trong `TripOrderDetail` page, show list các WOs đã match (mỗi WO + nút unmatch).
- [ ] **EXT-003 [P1]:** Income calc: nếu 1 TO link 2 WOs (2 tài xế), driver earnings của mỗi tài xế phải dùng phần nào? Cần rule: split equal / split theo container / split theo time? → cần DECISION mới.
- [ ] **EXT-004 [P2]:** Migration: revert unique constraint hiện tại có cho phép cùng pair `(TO, WO)` nhiều lần không cần thiết — review.

### Nếu DECISION-002 = YES (capacity validation)
- [ ] **EXT-005 [P2]:** Trong `MatchTripToWorkOrder`, trước khi `wo.match()`, validate `sum(containers of all matched TOs incl new one) ≤ wo.capacity_from_work_type`.
- [ ] **EXT-006 [P2]:** UI warning khi user tick TO sẽ vượt capacity.

### Nếu DECISION-003 = YES (PARTIAL_MATCHED status)
- [ ] **EXT-007 [P2]:** Thêm status `PARTIAL_MATCHED` vào `WorkOrderStatus` enum.
- [ ] **EXT-008 [P2]:** Update `WorkOrder.match()` để chuyển PENDING → PARTIAL_MATCHED → MATCHED (khi đủ capacity).
- [ ] **EXT-009 [P2]:** Counters dashboard: thêm bucket "Khớp một phần".
- [ ] **EXT-010 [P2]:** Salary calc: include / exclude PARTIAL_MATCHED?

### Nếu DECISION-004 = YES (income split per TO breakdown)
- [ ] **EXT-011 [P2]:** Driver earnings detail page: breakdown table — TO code, route, salary, allowance, sum per WO.
- [ ] **EXT-012 [P2]:** Backend: thêm endpoint `/salary/earnings/{driver_id}/breakdown` trả về granular.

### Nếu DECISION-005 = deprecate legacy MatchTrip page
- [ ] **EXT-013 [P2]:** Remove route `/match/:tripId` từ `frontend/src/routes.ts`.
- [ ] **EXT-014 [P2]:** Remove `frontend/src/pages/accountant/MatchTrip.tsx`.
- [ ] **EXT-015 [P2]:** Remove `use-match-trip.ts` nếu không còn sử dụng — confirm với grep.

---

## Open Questions / Risks

- ⚠️ **Risk-001:** 10 commits chưa push origin → nếu local máy fail / lost, mất hết multi-match. **Push ngay.**
- ⚠️ **Risk-002:** Deploy chưa chạy (per CLAUDE.md). Prod đang chạy code 1:1 cũ — accountant trên prod chưa thấy gì mới.
- ⚠️ **Risk-003:** Migration 005 đã backfill `trip_order_work_orders → reconciliations` từ trước, nhưng nếu có data 1:1 phát sinh giữa lần migration cũ và deploy mới → kiểm tra reconciliations count vs work_orders MATCHED count đối khớp.
- ⚠️ **Risk-004:** `apply_pricing_snapshot` accumulate có thể trigger double-count nếu match-unmatch-match cùng TO (TO salary đã có trong WO accumulated, unmatch trừ ra, match lại cộng vào — should be net zero). Verify trong test integration.
- ⚠️ **Risk-005:** Audit log có 4 action types khác nhau cho match (`MATCH`, `BATCH_MATCH_WO`, `AUTO_MATCH`, `BULK_MATCH`) — dashboard filter cần hiểu cả 4.

---

## Acceptance Criteria (definition of done)

- [x] Accountant có thể ghép 2+ đơn hàng vào 1 chuyến qua UI (`MatchDetailPanel` + `MatchTrip` page).
- [x] Accountant có thể bỏ ghép 1 đơn ra khỏi chuyến multi-match mà không ảnh hưởng đơn khác.
- [x] Driver income phản ánh tổng từ tất cả đơn đã ghép (cộng dồn qua `apply_pricing_snapshot`).
- [x] Counters "Chờ khớp" / "Đã khớp" chính xác (dựa vào WorkOrder.status).
- [x] Migration backfill cho data cũ (đã thực hiện ở 005_schema_redesign).
- [x] Không có regression trên flow 1:1 cũ (167 tests pass).
- [ ] **Build clean, lint clean, all tests pass** trên CI (cần verify VER-001).
- [ ] **Deployed lên prod** (cần DEP-002).
- [ ] **Smoke test prod pass** (cần DEP-003).

---

## Effort Estimate (rough)

- Verify + deploy: **2-4 giờ**
- Polish + cleanup: **3-5 giờ**
- Test gaps (FE + E2E): **1-2 dev-days**
- Docs: **2-3 giờ**
- Future extensions (sau DECISION): **2-5 dev-days/extension**

**Tổng tasks blocker ngay (P0):** ~4-8 giờ
**Tổng polish (P1-P2):** ~2-3 dev-days

---

## Appendix A — Mock task list "from-scratch" (nếu user muốn re-plan)

Lưu ý: phần này KHÔNG phản ánh thực tế (vì code đã có). Đây là template cho người mới tham khảo workflow chuẩn nếu phải làm lại từ đầu một feature multi-match tương tự cho project khác.

### Schema & Migration (giả định chưa có link table)
- BE-001 [P0]: Tạo `trip_order_matches` link table.
- BE-002 [P0]: Backfill từ FK 1:1 cũ.
- BE-003 [P1]: Drop FK 1:1 sau N weeks.

### Domain
- BE-004 [P0]: Update entity `WorkOrder` có quan hệ `MatchedTripOrders[]`.
- BE-005 [P0]: Repo methods `AddOrderMatch` / `RemoveOrderMatch`.

### Service
- BE-007 [P0]: Refactor `MatchTripToOrder` → `AddOrderToTripMatch`.
- BE-008 [P0]: `UnmatchOrderFromTrip`.
- BE-009 [P0]: Update trip status logic.

### Income
- BE-012 [P0]: `trip income = SUM(matched_orders.amount)`.

### API
- BE-014 [P0]: `POST /trips/:id/matches` body `{order_ids: [int]}`.
- BE-015 [P0]: `DELETE /trips/:id/matches/:order_id`.
- BE-018 [P1]: Auto-match suggest endpoint.

### Frontend
- FE-001 [P0]: API client updates.
- FE-003 [P0]: Master list panel với list matched orders.
- FE-004 [P0]: Multi-select checkbox UI.
- FE-006 [P0]: Per-row "Bỏ ghép" button.
- FE-009 [P0]: Trip detail panel với matched orders list.
- FE-010 [P0]: Badge "N đơn" trên trip list.

### Test
- TEST-001 [P0]: Integration test match 3 TOs, unmatch 1.
- TEST-002 [P0]: E2E flow.

---

**Last researched:** 2026-05-12
**Branch:** `main` (10 commits ahead of origin)
**Key commits:** `9107b4b` (find_link fix) → `fbfe576` (docs update). See `git log --oneline -15`.
