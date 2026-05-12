# Empty State — Auto-Match "No Match Found" Modal — Pending Task Spec

**Date:** 2026-05-12
**For:** Next SWE pickup
**Priority:** P2 (UX polish, không block release nhưng impactful)
**Effort:** ~0.5–1 dev-day

---

## Problem

Auto-match modal khi 0 matches found hiện đang là **dead-end UX**:

- Single button "Đóng" = passive, force user exit + recall manual next steps
- Center-aligned bullet list = khó scan, mắt phải nhảy giữa các dòng
- Generic star icon = không express failure state meaningfully — trông giống thông báo thành công hơn là không tìm thấy
- Stat "713 phiếu đã quét" không có breakdown → user nghi system broken hoặc filter sai
- Excessive vertical padding wastes space khi content sparse

User vừa scan 713 phiếu, found 0, và **không có path forward** ngoài việc đóng modal rồi tự nhớ ra cần làm gì.

---

## Goals

Transform "dead-end" → "next-step" UX:

1. Primary action progresses user toward solving the problem (vd điều hướng tới Map Alias)
2. Contextual breakdown explain **tại sao** 0 matched (chứ không chỉ "0 matched")
3. Visual illustration softens failure feeling (vs raw text/star icon)
4. Compact + scannable layout — left-aligned, grouped cards

---

## Proposed Design

### 1. Header Illustration (REPLACE star icon)

Replace small star icon với SVG illustration `<NoMatchEmptyStateIllustration />` (200×200px viewBox, scales down to ~120×120 in modal).

**Concept:** Kính lúp soi xuống bản đồ với 2 tuyến đường đứt đoạn — metaphor cho "đang tìm điểm khớp nhưng tuyến chưa nối được."

**Brand colors:** Primary green `#16a34a` + neutral muted `#94a3b8` + soft mint background `#f0fdf4`.

**Inline SVG markup** (paste vào component hoặc save as `frontend/src/assets/illustrations/no-match-empty-state.svg`):

```xml
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Không tìm thấy cặp ghép — minh họa kính lúp soi tuyến đường không khớp">
  <defs>
    <style>
      .stroke-primary { stroke: #16a34a; }
      .stroke-muted   { stroke: #94a3b8; }
      .fill-primary   { fill: #16a34a; }
      .fill-muted     { fill: #94a3b8; }
      .fill-bg        { fill: #f0fdf4; }
      .fill-white     { fill: #ffffff; }
    </style>
  </defs>

  <!-- Soft background disc behind the scene -->
  <circle cx="100" cy="100" r="92" class="fill-bg" />

  <!-- Stylized map "paper" tilted slightly behind the lens -->
  <g transform="translate(38 58) rotate(-6 60 45)">
    <rect x="0" y="0" width="120" height="90" rx="6"
          class="fill-white stroke-muted" stroke-width="1.5"/>
    <line x1="0"  y1="30" x2="120" y2="30" class="stroke-muted" stroke-width="0.75" stroke-dasharray="2 3"/>
    <line x1="0"  y1="60" x2="120" y2="60" class="stroke-muted" stroke-width="0.75" stroke-dasharray="2 3"/>
    <line x1="40" y1="0"  x2="40"  y2="90" class="stroke-muted" stroke-width="0.75" stroke-dasharray="2 3"/>
    <line x1="80" y1="0"  x2="80"  y2="90" class="stroke-muted" stroke-width="0.75" stroke-dasharray="2 3"/>
  </g>

  <!-- Two unconnected route segments (the "no match" metaphor) -->
  <path d="M 48 92 Q 64 78 78 84"
        class="stroke-primary" stroke-width="2.25" fill="none"
        stroke-linecap="round" stroke-dasharray="4 4"/>
  <path d="M 108 110 Q 124 100 142 106"
        class="stroke-primary" stroke-width="2.25" fill="none"
        stroke-linecap="round" stroke-dasharray="4 4"/>

  <!-- Pickup pin (left, primary green) -->
  <g transform="translate(44 80)">
    <path d="M 4 0 C 7.3 0 10 2.7 10 6 C 10 10.5 4 16 4 16 C 4 16 -2 10.5 -2 6 C -2 2.7 0.7 0 4 0 Z"
          class="fill-primary"/>
    <circle cx="4" cy="6" r="2" class="fill-white"/>
  </g>

  <!-- Dropoff pin (right, muted — route is broken) -->
  <g transform="translate(138 96)">
    <path d="M 4 0 C 7.3 0 10 2.7 10 6 C 10 10.5 4 16 4 16 C 4 16 -2 10.5 -2 6 C -2 2.7 0.7 0 4 0 Z"
          class="fill-muted"/>
    <circle cx="4" cy="6" r="2" class="fill-white"/>
  </g>

  <!-- Gap indicator: tiny X between the two route ends -->
  <g transform="translate(91 96)" class="stroke-muted" stroke-width="1.75" stroke-linecap="round">
    <line x1="-4" y1="-4" x2="4" y2="4"/>
    <line x1="-4" y1="4"  x2="4" y2="-4"/>
  </g>

  <!-- Magnifying glass lens — sits over the gap -->
  <circle cx="92" cy="96" r="34"
          stroke="#16a34a" fill="#ffffff"
          stroke-width="4" fill-opacity="0.55"/>
  <path d="M 72 82 Q 78 76 86 76"
        stroke="#ffffff" stroke-width="2.5"
        fill="none" stroke-linecap="round" opacity="0.85"/>

  <!-- Magnifying glass handle -->
  <line x1="117" y1="121" x2="148" y2="152"
        stroke="#16a34a" stroke-width="7" stroke-linecap="round"/>
  <line x1="117" y1="121" x2="148" y2="152"
        stroke="#15803d" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
</svg>
```

**Asset location:** Standalone SVG đã save tại `/Users/dev/Library/Application Support/Claude/.../outputs/no-match-empty-state.svg` — SWE copy to `frontend/src/assets/illustrations/no-match-empty-state.svg` khi implementing.

---

### 2. Title + Subtitle

- **H2:** `Không tìm thấy cặp ghép phù hợp`
- **Subtitle (muted):** `Hệ thống đã quét 713 phiếu chờ ghép nhưng chưa tìm được cặp khớp ở mức tối thiểu.`

Khoảng cách: 12px giữa illustration và title, 4px giữa title và subtitle.

---

### 3. Contextual Breakdown Card (NEW)

Left-aligned card showing **why** no matches were found. Backend cần return categorized counts.

**Visual:**

```
┌─────────────────────────────────────────────┐
│ 📍 Lý do chính                              │
│                                              │
│  ⚠️  400 phiếu chưa map địa điểm   (56%)   │
│  📅  313 phiếu thiếu ngày đi       (44%)   │
│  ✓   0 phiếu khớp 5/5 tiêu chí              │
└─────────────────────────────────────────────┘
```

**Spec:**
- Card with subtle border (`border-slate-200`) + soft background (`bg-slate-50`)
- Each row: icon (16×16) + count (font-semibold tabular-nums) + reason text + percentage chip
- Color-code severity:
  - Red text `text-red-600` cho rows >50% của scanned total
  - Yellow `text-amber-600` cho 10–50%
  - Gray `text-slate-500` cho <10%
- Percentage chip: small rounded badge với matching color (red/yellow/gray bg-tinted)

---

### 4. Suggestion Card (REFACTORED from center bullets)

Replace center-aligned bullet list với left-aligned card:

```
┌─────────────────────────────────────────────┐
│ 💡 Gợi ý xử lý                              │
│                                              │
│  🔍  Kiểm tra alias địa điểm                │
│      (HAIAN, HPH, Hai Phong...)             │
│  📅  Bổ sung ngày đi cho phiếu thiếu        │
│      thông tin                              │
│  ✏️  Sửa typo trong tên khách hàng /        │
│      container                              │
└─────────────────────────────────────────────┘
```

**Spec:**
- Same card style as breakdown card (visual consistency)
- Each suggestion: icon + primary line + optional secondary line (muted, smaller)
- 12px padding between rows
- Smart ordering: surface suggestions matching the top breakdown reason first

---

### 5. Action Buttons (REPLACED single "Đóng")

Footer row, **3 actions** in priority order:

| # | Label                       | Style              | Action                                              |
|---|-----------------------------|--------------------|-----------------------------------------------------|
| 1 | `Đi tới Map Alias`          | Primary (green)    | Navigate to `/accountant/settings/locations`        |
| 2 | `Thêm phiếu chuyển mới`     | Outlined           | Open trip-order create modal/page                   |
| 3 | `Đóng`                      | Text-only link     | Close modal (also available as top-right `×` icon)  |

**Smart default:** Nếu breakdown shows >50% missing alias → Primary = `Đi tới Map Alias`. Nếu >50% missing date → Primary = `Bổ sung ngày đi`. Default fallback = `Đi tới Map Alias`.

**Layout:**
- Right-aligned trên desktop
- Stacked vertically (full-width) trên mobile <640px
- 8px gap between buttons

---

### 6. Layout & Spacing

- Modal `max-width: 480px` (compact, không full-screen)
- Padding: `24px` header, `16px` between sections, `24px` footer
- Total height target: **<600px** so it fits viewport without scrolling on 1024×768
- Top-right close `×` icon (16×16, ghost button, top-right corner of modal)
- Z-index: same as existing AutoMatchDialog

---

## Tasks Checklist

### Backend

- [ ] **BE-001** [P0]: Auto-match endpoint trả empty-result breakdown field

  Endpoint: `POST /reconcile/auto-match` (existing) — extend response:

  ```json
  {
    "candidates": [],
    "stats": {
      "scanned": 713,
      "reasons": [
        { "code": "missing_location_alias", "label": "Chưa map địa điểm", "count": 400 },
        { "code": "missing_date",           "label": "Thiếu ngày đi",     "count": 313 },
        { "code": "perfect_match",          "label": "Khớp 5/5 tiêu chí",  "count": 0   }
      ]
    }
  }
  ```

  **Files likely changed:**
  - `backend/app/contexts/operations/interface/routers/reconcile.py` (or service)
  - `backend/app/contexts/operations/infrastructure/match_suggester.py` (compute breakdown)
  - Pydantic DTO in `backend/app/contexts/operations/interface/schemas/domain.py`

  **Implementation note:** Counting strategy — during the scan loop in `suggest_matches`, increment a counter for each WO/TO rejected, keyed by primary rejection reason (first failing criterion wins). Reasons sorted by `count DESC` in response.

### Frontend

- [ ] **FE-001** [P0]: Add `no-match-empty-state.svg` to `frontend/src/assets/illustrations/` (asset file from outputs folder)

- [ ] **FE-002** [P0]: Create `<NoMatchEmptyState>` component

  Location: `frontend/src/pages/accountant/work-orders/components/NoMatchEmptyState.tsx`

  Props:
  ```typescript
  interface NoMatchEmptyStateProps {
    scanned: number;
    reasons: Array<{ code: string; label: string; count: number }>;
    onGoToAliasMap: () => void;
    onCreateTripOrder: () => void;
    onClose: () => void;
  }
  ```

  Renders: illustration + title + subtitle + breakdown card + suggestion card + 3 buttons.

- [ ] **FE-003** [P0]: Render `<NoMatchEmptyState>` trong `AutoMatchDialog.tsx` khi `candidates.length === 0`

  Current implementation: `frontend/src/pages/accountant/work-orders/AutoMatchDialog.tsx` (renders bullet list inline). Replace empty-state branch with new component.

- [ ] **FE-004** [P0]: "Đi tới Map Alias" button → navigate to `/accountant/settings/locations`

  Verify route exists in `App.tsx` routing config. If not, log a follow-up task to add settings page.

- [ ] **FE-005** [P1]: "Thêm phiếu chuyển mới" → open trip-order create modal hoặc navigate `/accountant/trip-orders/new`

- [ ] **FE-006** [P1]: Render contextual breakdown card từ `stats.reasons` array

  - Sort reasons by count desc (backend already does this, but be defensive)
  - Compute percentage = `count / scanned * 100`, round to integer
  - Color-code per severity thresholds (50% / 10%)
  - Hide rows with `count === 0` unless it's `perfect_match` (which is informational)

- [ ] **FE-007** [P1]: Smart-default primary action based on top reason

  If `reasons[0].code === 'missing_location_alias'` → Primary = "Đi tới Map Alias"
  If `reasons[0].code === 'missing_date'` → Primary = "Bổ sung ngày đi" (new action, may need a date-bulk-edit page; if doesn't exist, fall back to "Đi tới Map Alias")

- [ ] **FE-008** [P2]: Mobile responsive — stack action buttons vertically on screens <640px

- [ ] **FE-009** [P2]: A11y check — illustration has `role="img"` + `aria-label` (already in SVG markup), buttons have proper labels, focus trap inside modal

---

## Acceptance Criteria

- [ ] 0-match modal shows illustration thay vì star icon
- [ ] Title + breakdown card + suggestion card all left-aligned + scannable
- [ ] 2–3 action buttons replace single "Đóng" — primary action navigates productively (not just close)
- [ ] Breakdown card hiển thị count + percentage per reason, color-coded by severity
- [ ] Total modal height < 600px on 1024×768 viewport, no vertical scroll
- [ ] Backend trả `stats.reasons` correctly broken down (sum of counts may exceed `scanned` if multi-reason; document if so)
- [ ] No regression on match-found flow (this only affects `candidates.length === 0` branch)
- [ ] Mobile <640px: buttons stack vertically, modal width 100%-32px margin
- [ ] Keyboard navigation works: Tab cycles through breakdown items → suggestions → buttons → close
- [ ] Screen reader announces title + scanned count + top reason + primary action

---

## Files Likely Changed

**Frontend:**
- `frontend/src/pages/accountant/work-orders/AutoMatchDialog.tsx` (replace empty-state branch)
- `frontend/src/pages/accountant/work-orders/components/NoMatchEmptyState.tsx` (NEW)
- `frontend/src/assets/illustrations/no-match-empty-state.svg` (NEW)
- `frontend/src/lib/api/tripOrders.api.ts` (extend response type if not auto-generated)
- `frontend/src/types/domain.ts` (add `MatchStats` / `MatchReason` types)

**Backend:**
- `backend/app/contexts/operations/interface/routers/reconcile.py`
- `backend/app/contexts/operations/infrastructure/match_suggester.py`
- `backend/app/contexts/operations/interface/schemas/domain.py` (extend DTO)

**Tests:**
- `tests/integration/test_reconcile.py` — extend assertion để check `stats.reasons` shape
- `tests/integration/test_auto_match_empty_state.py` (NEW) — seed data với known missing alias / missing date, assert breakdown counts

---

## Design Reference

See `auto-match-feedback-spec.md` (if exists in this folder) for the broader auto-match feedback feature this builds on. The "no match found" state is an edge case của primary success flow.

Asset preview: SVG illustration saved at outputs folder (see Step 1 inline markup).

---

## Dependencies

- Should ship **sau** auto-match feedback core implementation (PM spec documented separately)
- Verify route `/accountant/settings/locations` (or equivalent alias-mapping page) exists. If chưa có, file follow-up task to add alias-mapping settings page first.
- Backend extension is backward-compatible — frontend `stats.reasons` consumer should handle `undefined` gracefully (fall back to generic suggestions list).

---

## Out of Scope

- Building the alias-mapping page itself (separate task if doesn't exist)
- Bulk-edit "missing date" workflow (separate task if pursued)
- Changing match-found success flow
- Changing the auto-match algorithm itself — this is purely the empty-state UX

---

**Author:** Cowork PM agent
**Last Updated:** 2026-05-12
