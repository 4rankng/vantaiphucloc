# Unify Đối Soát Sidebar + Define 4 Reconciliation Modes — Pending Task Spec

**Date:** 2026-05-14
**For:** Next SWE pickup
**Priority:** P1 (UX consolidation + missing modes)
**Effort:** ~3-5 dev-days (UX restructure + 2 new file-upload flows + fuzzy matching)

---

## Problem

**Current state (UI):** Sidebar has **3 separate menu items** all related to đối soát:
- (verify exact labels — likely some combination of: Ghép chuyến, Đối soát đơn hàng, Đối soát nhà thầu, Đối soát file)

This fragments what is conceptually ONE workflow (reconcile trips ↔ orders) into multiple disconnected UIs. Ketoan has to remember which entry point fits each scenario instead of landing on one page that shapes itself to the situation.

**Current state (functional):** The reconciliation logic only really supports Mode 1 (auto-match on driver trip submission against pre-loaded orders). Modes 2-4 either don't exist or are stitched together via ad-hoc Excel exports + manual matching.

---

## Goals

1. **Sidebar:** Single menu item "Đối soát" — one page, mode picker inside, contextual.
2. **Cover 4 reconciliation modes** explicitly in product (not via workarounds).
3. **Fuzzy-match tolerance:** when 5/5 criteria match but 1-2 chars typo, accept match + show warning. Don't reject.
4. **Bidirectional file flows:** support both inbound (customer/contractor sends to us) and outbound (we send to them) with the same interface.
5. **AI parser for inbound files:** every customer/vendor sends Excel/CSV trong format khác nhau. Output mình đã chuẩn hóa rồi (canonical schema software hiểu). Dùng LLM để parse input arbitrary → mapping sang canonical schema, rồi reuse downstream logic.

---

## 4 Reconciliation Modes (User-Described)

### Mode 1: Customer sends order file FIRST (proactive)
**Trigger:** Customer (khách hàng) emails order list → ketoan uploads via UI → orders saved as candidates.
**Then:** Driver (tài xế) submits each completed trip → backend auto-matches against candidate orders.
**Match outcome:**
- ✅ Exact match → auto-link, status `Đã khớp`
- ⚠️ Match all criteria but 1-2 chars typo (Levenshtein distance ≤ 2 on container number, route name, or customer name) → auto-link with warning flag, ketoan reviews
- ❌ No match → trip stays `Chờ ghép`, surfaces in pending list

**Current state:** Partial. Auto-match exists, but no fuzzy-tolerance; typos cause hard reject.

### Mode 2: Customer sends order file LATER (reactive)
**Trigger:** Drivers have already submitted trips throughout the day/week. Customer emails order file end of period.
**Then:** Ketoan uploads file → backend runs reconciliation pass against ALL existing unmatched trips → batch results.
**Match outcome:** Same fuzzy logic as Mode 1. Output: report showing N matched, M warnings, K unmatched.

**Current state:** Effectively manual — ketoan downloads existing trip list, compares in Excel, manually flags. No bulk match endpoint that takes order file as input.

### Mode 3: Ketoan exports trip report → Customer reviews → Customer sends back
**Trigger:** End of period, ketoan exports list of completed trips (per customer) as Excel.
**Then:** Customer receives, reviews, marks "approved" / "rejected" / "amount changed" per row, sends file back.
**Then:** Ketoan uploads customer's response → backend updates trip statuses, flags discrepancies (e.g. customer rejected, customer changed amount, customer added rows we don't have).

**Current state:** Export likely exists; upload-back doesn't. Discrepancy reporting needs design.

### Mode 4: Reconciliation with contractor (nhà thầu)
**Trigger:** Same as Mode 3 but with contractor instead of customer.
**Variants:**
- 4a: We send our completed-trips report → contractor reviews → returns
- 4b: Contractor sends their trip list → we review → mark match/mismatch

**Current state:** Same as Mode 3 — partial export exists, no upload-back/structured reconcile.

---

## Proposed Design

### Single Sidebar Entry

Replace 3 menu items with 1: **"Đối soát"** (icon: scale ⚖️ or document-check 📋).

When ketoan clicks → lands on `/accountant/reconciliation` (or keep existing `/accountant/work-orders` URL for back-compat) with **mode picker** as first interaction:

```
┌────────────────────────────────────────────────────┐
│  Đối soát                                          │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🔍 Bạn muốn làm gì?                          │  │
│  │                                              │  │
│  │ ☐ Đối soát chuyến với đơn hàng khách        │  │
│  │   (auto-match khi tài xế nộp / khi upload)  │  │
│  │                                              │  │
│  │ ☐ Đối soát với khách hàng (xuất → nhập)     │  │
│  │   (gửi báo cáo cho khách, nhận lại review)  │  │
│  │                                              │  │
│  │ ☐ Đối soát với nhà thầu                     │  │
│  │   (cùng pattern xuất ↔ nhập)                │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

Or — better — show **3 tabs** at top of one page:
- Tab 1: **Khớp chuyến** (Mode 1 + 2 unified — "ghép chuyến với đơn hàng")
- Tab 2: **Đối soát khách hàng** (Mode 3)
- Tab 3: **Đối soát nhà thầu** (Mode 4)

With each tab persisting its own filter/state.

### Tab 1 — Khớp chuyến (Mode 1 + 2)

Existing `WorkOrderMasterList` UI, plus:
- **"Tải file đơn hàng"** button at top — opens upload dialog (Mode 2 trigger)
- After upload: backend runs batch match → results shown as banner: "Đã ghép: N chuyến · Cảnh báo: M chuyến · Chưa ghép: K chuyến"
- Click banner → filter list to that subset

Pre-existing per-trip click → match candidates panel (existing flow).

### Tab 2 — Đối soát khách hàng (Mode 3)

Two-pane:
- **Left:** Khách hàng picker (search + select)
- **Right:** Period picker → action buttons:
  - `[📤 Xuất báo cáo cho khách]` — generates Excel of completed trips for that period, downloads
  - `[📥 Tải file phản hồi từ khách]` — uploads customer's reviewed file, runs reconcile
  - `[📜 Lịch sử đối soát]` — shows past export/import cycles for this customer

After upload of response file:
- Show diff table: trips marked OK by customer, trips rejected, trips with amount changes, trips customer added that we don't have, trips we have that customer didn't acknowledge
- Action per row: Accept / Dispute / Edit
- Bulk action: "Áp dụng tất cả thay đổi đã chọn"

### Tab 3 — Đối soát nhà thầu (Mode 4)

Same UI as Tab 2 but:
- Left pane is Nhà thầu (vendor) picker
- Two flow directions explicit:
  - **4a:** Same as Mode 3 — export to vendor → upload response
  - **4b:** "Tải file chuyến của nhà thầu" button — uploads vendor's trip list, reconciles against ours

---

## Fuzzy Matching Logic (Cross-cutting for Modes 1 + 2)

**Current logic** (likely): exact string match on container, customer, route, dates.

**Proposed:** When string field matches all OTHER criteria but the string field itself is `≤ 2 Levenshtein edit distance` away, accept as match + raise warning flag.

Apply to:
- Container number (`CMAU2422633` vs `CMAU2422633` — case-insensitive, ignore whitespace; `CMAU2422634` vs `CMAU2422633` = 1 distance → warn)
- Customer name (`Công ty TNHH HẢI AN` vs `Cong ty TNHH HAI AN` — diacritic-insensitive comparison + edit distance)
- Route locations (`Hai Phong` vs `Hải Phòng` — diacritic-insensitive; `Haiphong` vs `Hai Phong` — whitespace + edit distance)

Don't apply to:
- Date (any difference = real mismatch)
- Amount (any difference = real mismatch — must surface)

Each match should carry a `match_warnings: ["container typo: CMAU2422634 vs CMAU2422633"]` field so UI can show ⚠️ icon and explanation.

---

## Tasks Checklist

### Phase 1 — Sidebar Consolidation (Quick win, ~0.5 day)

- [ ] **TASK-S01** [P0]: Identify 3 current sidebar entries related to đối soát + their routes
- [ ] **TASK-S02** [P0]: Sidebar config — collapse to single "Đối soát" entry pointing at consolidated page
- [ ] **TASK-S03** [P1]: Add tabs UI to consolidated page (3 tabs: Khớp chuyến / Đối soát khách hàng / Đối soát nhà thầu)
- [ ] **TASK-S04** [P1]: Migrate existing routes to keep back-compat redirects

### Phase 2 — Fuzzy Match Tolerance (Mode 1 enhancement, ~1 day)

- [ ] **TASK-FM01** [P0]: Add `match_warnings: string[]` field to MatchSuggestion DTO
- [ ] **TASK-FM02** [P0]: Backend match algorithm — replace exact string equality on container/customer/route with Levenshtein-distance-2 check (after diacritic-normalize)
- [ ] **TASK-FM03** [P0]: When fuzzy-match triggers, populate `match_warnings` with what was different
- [ ] **TASK-FM04** [P1]: Frontend MatchDetailPanel — show ⚠️ icon next to fuzzy-matched criterion + tooltip with both values
- [ ] **TASK-FM05** [P1]: Auto-link with warning (don't require manual confirm) — counter "Đã ghép tự động: N (M có cảnh báo)"
- [ ] **TASK-FM06** [P2]: Settings — make Levenshtein threshold configurable per criterion (default 2)

### Phase 3 — Mode 2: Bulk Order File Upload (~1 day)

- [ ] **TASK-M201** [P0]: Backend endpoint `POST /api/v1/work-orders/bulk-import-and-match` accepting Excel file
- [ ] **TASK-M202** [P0]: Parse Excel, create candidate orders, run batch match against existing unmatched trips
- [ ] **TASK-M203** [P0]: Return summary `{ created: N, matched: M, warnings: K, unmatched: P }`
- [ ] **TASK-M204** [P0]: Frontend "Tải file đơn hàng" button on Khớp chuyến tab → modal with file picker + post-upload result banner
- [ ] **TASK-M205** [P1]: Validate Excel format before upload, show errors inline (missing columns, bad data)
- [ ] **TASK-M206** [P1]: Show import history per khách hàng (last 5 imports, who/when/result)

### Phase 4 — Mode 3: Customer Reconciliation Cycle (~1.5 days)

- [ ] **TASK-M301** [P0]: Backend endpoint `GET /api/v1/customers/:id/trips/export?from&to` returns Excel
- [ ] **TASK-M302** [P0]: Excel template — columns: trip_id (hidden), date, route, container, amount, status, customer_check (empty for customer to fill: OK / SỬA / TỪ CHỐI / amount)
- [ ] **TASK-M303** [P0]: Backend endpoint `POST /api/v1/customers/:id/trips/import-response` accepting filled Excel
- [ ] **TASK-M304** [P0]: Diff engine — for each row, classify outcome (OK / rejected / amount-changed / added-by-customer / missing)
- [ ] **TASK-M305** [P0]: Frontend Đối soát khách hàng tab — customer picker + period + 2 buttons (export / upload response)
- [ ] **TASK-M306** [P0]: Diff result table — per-row action buttons (accept / dispute / edit); bulk "Áp dụng tất cả"
- [ ] **TASK-M307** [P1]: History — past reconciliation cycles per customer (date, # trips, # accepted, # disputed)
- [ ] **TASK-M308** [P1]: Audit log — every reconciliation action recorded (who/when/before/after)

### Phase 5 — Mode 4: Contractor Reconciliation (~1 day)

- [ ] **TASK-M401** [P0]: Backend endpoints mirror Mode 3 but for `vendors` (contractors): export + import-response
- [ ] **TASK-M402** [P0]: Mode 4b additional — `POST /api/v1/vendors/:id/trips/import-vendor-list` (vendor sends THEIR trip list to us, we reconcile against ours)
- [ ] **TASK-M403** [P0]: Frontend Đối soát nhà thầu tab — vendor picker + 3 buttons (export / upload response / upload vendor list)
- [ ] **TASK-M404** [P1]: Mode 4b diff — for each vendor-claimed trip, find matching trip in our DB; flag missing/conflicting
- [ ] **TASK-M405** [P1]: Vendor reconciliation history

### Phase 6 — Cross-cutting Polish (~0.5 day)

- [ ] **TASK-X01** [P1]: Excel parsing utility shared across upload flows (centralized)
- [ ] **TASK-X02** [P1]: Excel export utility with template versioning (so we can detect old templates)
- [ ] **TASK-X03** [P2]: Email integration — "Send report directly to customer's email" (avoid Excel-by-Zalo workflow)
- [ ] **TASK-X04** [P2]: Per-customer fuzzy-match threshold (some customers picky, others tolerant)

---

### Phase 7 — AI Parser for Arbitrary Input Files (~2-3 days)

**Why:** Mỗi khách / nhà thầu gửi file format khác nhau (column order khác, header tên khác, vài rows preamble, merged cells, mixed dates, kèm chữ ký dưới cùng, etc.). Output canonical mình đã định nghĩa rõ. Thay vì viết N parsers riêng cho N customers, dùng LLM để map.

**Canonical output schema (define if not already):**
```typescript
type CanonicalImportRow = {
  date: string;              // ISO YYYY-MM-DD
  customer_name?: string;    // for vendor files; mình suy luận
  route_from: string;
  route_to: string;
  container_number: string;
  container_type: 'F20' | 'F40' | 'E20' | 'E40' | string;
  amount?: number;           // VND
  vendor_name?: string;      // for customer files
  driver_name?: string;
  vehicle_plate?: string;
  notes?: string;
  source_row_ref: string;    // original row number/identifier for traceback
};
```

**Architecture:**

1. **Stage 1 — Sniff:** Read first ~20 rows of uploaded file. Send to LLM with prompt:
   > "This is a Vietnamese trucking company's reconciliation file. Identify which columns map to: date, route_from, route_to, container_number, container_type, amount, etc. Return JSON mapping `{column_index: canonical_field}` plus header row index."
   
   LLM returns column mapping + skip-rows count + confidence score.

2. **Stage 2 — Mapping cache:** Save mapping per `(customer_id | vendor_id, file_signature_hash)`. Next upload from same source with same column structure → use cached mapping, skip LLM call.

3. **Stage 3 — Apply mapping:** Programmatic apply (no LLM per row — just column-index lookup). Fast.

4. **Stage 4 — Row-level cleanup:** For ambiguous rows (date format unclear, container number with extra chars, amount with currency suffix), per-row LLM clean-up. Threshold: only call LLM nếu programmatic parse fails.

5. **Stage 5 — Preview + confirm:** Before commit to DB, show ketoan preview of first 20 mapped rows + flag low-confidence ones. Ketoan corrects column mapping inline if AI got it wrong (override saved → improves future cache hits).

**Cost control:**
- Cache mappings aggressively (per customer/vendor + file structure hash) — typical recurring customers should hit LLM rarely
- Stage 4 (row-level) gated by programmatic-parse-failure — most rows go straight through without LLM
- Limit token: send max 50 rows × 20 cols sample to Stage 1 sniff, not entire file
- Use cheaper model (e.g. Haiku / GPT-4o-mini) for sniff stage; reserve Opus/Sonnet for ambiguous-row Stage 4

**Tasks:**

- [ ] **TASK-AI01** [P0]: Define canonical import schema (TypeScript + Pydantic) — single source of truth
- [ ] **TASK-AI02** [P0]: Backend service `ai_parser.py` — Stage 1 sniff endpoint (LLM call + JSON response)
- [ ] **TASK-AI03** [P0]: Mapping cache table — `import_mappings(source_id, source_type, file_hash, mapping_json, created_at, hit_count)`
- [ ] **TASK-AI04** [P0]: Stage 3 mapping applier — pure function, no LLM
- [ ] **TASK-AI05** [P1]: Stage 4 row-level cleanup — gated by `try_programmatic_parse() == None`
- [ ] **TASK-AI06** [P0]: Stage 5 preview UI — table showing first 20 mapped rows + per-cell confidence indicator + edit-mapping button
- [ ] **TASK-AI07** [P1]: Override flow — when ketoan corrects column mapping in preview, save corrected mapping back to cache (treat as ground truth for that source)
- [ ] **TASK-AI08** [P1]: Error handling — LLM timeout / cost cap / malformed JSON → graceful fallback ("Vui lòng dùng template chuẩn" or manual mapping wizard)
- [ ] **TASK-AI09** [P2]: Audit log — every AI parse decision recorded (file hash, mapping used, override count). For ML feedback later.
- [ ] **TASK-AI10** [P2]: Cost monitoring — daily LLM API spend per customer/vendor, alert nếu spike

**LLM prompt template (Stage 1 sniff):**

```
You are parsing a Vietnamese trucking reconciliation file.

Sample (first 20 rows × all columns), JSON-encoded:
[[...], [...], ...]

Canonical fields to map TO:
- date (Vietnamese: ngày)
- route_from (Vietnamese: điểm lấy / nơi đi)
- route_to (Vietnamese: điểm trả / nơi đến)
- container_number (Vietnamese: số container, mã cont)
- container_type (Vietnamese: loại cont - F20/F40/E20/E40)
- amount (Vietnamese: số tiền, doanh thu, đơn giá)
- customer_name (Vietnamese: khách hàng, KH, công ty)
- vendor_name (Vietnamese: nhà thầu, NCC)
- driver_name (Vietnamese: tài xế, TX)
- vehicle_plate (Vietnamese: biển số xe, BSX)
- notes (Vietnamese: ghi chú)

Return JSON only:
{
  "header_row_index": <0-based index of row containing column headers, or null if no headers>,
  "data_start_row_index": <0-based index of first data row>,
  "column_map": { "0": "date", "1": "route_from", ... },
  "confidence": 0.0-1.0,
  "notes": "string explaining any ambiguity"
}
```

**Privacy/security:**
- Strip PII from sample sent to LLM where possible (driver/customer names) — replace with placeholders, restore after mapping
- Or — use self-hosted LLM if data sensitivity is high (Vietnamese trucking data may include personal info, contact phones)
- User OK with sending to OpenAI/Anthropic APIs?

**Acceptance criteria for Phase 7:**
- [ ] Upload arbitrary Excel from a real customer file → AI maps columns correctly ≥80% of time first try
- [ ] Cached mapping → second upload from same source skips LLM (verify via logs)
- [ ] Ketoan can edit mapping in preview before commit → corrections cached for next time
- [ ] LLM cost per import < 0.05 USD (assuming Haiku for sniff) for typical 50-200 row file
- [ ] Graceful fallback when LLM unavailable — manual mapping wizard works

---

## Acceptance Criteria

- [ ] Sidebar has exactly 1 "Đối soát" entry (down from 3)
- [ ] All 4 modes accessible from one page (3 tabs)
- [ ] Mode 1 fuzzy-tolerates ≤2 char typos with visible warning, no manual confirm needed
- [ ] Mode 2 bulk upload from customer order Excel → batch match → result banner shown
- [ ] Mode 3 export-import cycle completes end-to-end with diff table
- [ ] Mode 4 (both 4a and 4b) functional for contractor reconciliation
- [ ] Old sidebar entry URLs still resolve (redirect to new tabs)
- [ ] Audit log records all reconciliation actions with diff
- [ ] Vietnamese labels consistent (sentence case page H1, ALL-CAPS section dividers per existing style)

---

## Open Questions / Risks

- ⚠️ **What ARE the 3 current sidebar entries exactly?** Need to enumerate before designing migration. Likely: `Ghép chuyến` (existing), `Đối soát đơn hàng` (?), `Đối soát nhà thầu` (?). Verify via current sidebar inspection before TASK-S01.
- ⚠️ **Excel template format** — does customer agree to fill in our template, or do they send their own free-format file? If free-format, need to ask customer to pick from a small set of canonical layouts OR use AI parsing fallback.
- ⚠️ **Diff classification ambiguity** — if customer changes amount AND container number, is it "amount changed" + "container changed" or "rejected + new"? Decide rule.
- ⚠️ **Fuzzy threshold = 2 OK for container?** Container numbers have check digits — 1-char typo could create a real-but-wrong container reference. Maybe threshold 1 for container, 2 for everything else.
- ⚠️ **Vendor list (Mode 4b) trip-mapping** — how do we know which vendor row corresponds to which of our trips when no shared ID? Same fuzzy match approach but with extra vendor-side metadata?
- ⚠️ **Performance** — bulk import of large Excel (1000+ rows) needs background job, not synchronous response. Phase 3-5 should add async job pattern.

---

## Files Likely Changed

**Sidebar consolidation:**
- `frontend/src/components/shared/AccountantLayout/AccountantSidebar.tsx` (or wherever sidebar is defined)
- `frontend/src/App.tsx` or routes file — redirect old paths

**Page consolidation:**
- New: `frontend/src/pages/accountant/Reconciliation/index.tsx` (with tabs)
- Move existing logic from current 3 pages into tab components

**Fuzzy matching:**
- Backend: `backend/app/contexts/operations/infrastructure/match_suggester.py` (criteria comparison + warning population)
- Backend: `backend/app/utils/fuzzy.py` (new — Levenshtein + diacritic helpers)
- Frontend: `MatchDetailPanel.tsx` (warning UI)

**Mode 2 (bulk upload):**
- Backend: `backend/app/contexts/operations/interface/routers/work_orders.py` (new endpoint)
- Backend: `backend/app/contexts/operations/application/bulk_import_service.py`
- Frontend: `frontend/src/pages/accountant/Reconciliation/Tab1MatchTrips.tsx`

**Mode 3 (customer reconcile):**
- Backend: new context `reconciliation/` with customer flows
- Frontend: `frontend/src/pages/accountant/Reconciliation/Tab2CustomerReconcile.tsx`

**Mode 4 (vendor reconcile):**
- Backend: same `reconciliation/` context, vendor flows
- Frontend: `frontend/src/pages/accountant/Reconciliation/Tab3VendorReconcile.tsx`

---

## Suggested Sprint Sequence

1. **Sprint 0 (this sprint):** Phase 1 (sidebar consolidation) — pure UX win, low risk
2. **Sprint 1:** Phase 2 (fuzzy matching) + Phase 3 (Mode 2 bulk upload, programmatic parser) — core feature improvement
3. **Sprint 2:** Phase 4 (Mode 3 customer reconcile) — bigger feature, end-to-end cycle
4. **Sprint 3:** Phase 5 (Mode 4 vendor) + Phase 6 (polish)
5. **Sprint 4:** Phase 7 (AI parser) — adds intelligence on top of existing flows. Ship after canonical schema + bulk upload pipeline are stable.

Phases 1-2 can ship to prod without Phases 3-7; consolidated UI works with existing reconciliation logic.

**Phase 7 dependency:** must come after Phase 3 (bulk upload backend exists) — AI parser is just a smarter input adapter to the same downstream pipeline. Don't build it inline with bulk upload; let bulk upload work programmatically first, then layer AI as fallback for unrecognized formats.

---

## Notes

- This is the unified spec for the 4-mode reconciliation feature. Related/overlapping prior specs may need to be marked superseded:
  - `auto-match-feedback-spec.md` — Mode 1 enhancement, still valid as sub-feature
  - `split-multi-container-orders.md` — independent, still valid
  - `fix-checkbox-selection-auto-match-modal.md` — bug fix, ship before this redesign
- Keep `pending-tasks` in sync — when Phase 1 ships, mark TASK-S01..S04 done; cross-link to commits.

---

**No git operations during pickup per workflow rule. Manual review and commit by user.**
