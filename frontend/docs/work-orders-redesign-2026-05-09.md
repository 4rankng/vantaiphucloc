# Ghép chuyến — Redesign 2026-05-09

> **Goal:** rebuild `/accountant/work-orders` (Ghép chuyến / matching) to be foolproof, fast to scan, and easy to fix typos so we can drive match rate towards 100%.

---

## 1. Audit — what's wrong with the current page

| # | Problem | Evidence |
| - | - | - |
| 1 | **One column, scroll forever.** Master list (Ghép chuyến rows) and detail (MatchPanel) stack vertically. Clicking a row pushes the suggestions far below the fold; user loses orientation. | `WorkOrderList.tsx` renders `<DataTablePro renderExpandedRow=…>` — every click expands inline, no side-by-side. |
| 2 | **Match score is invisible.** Suggestion cards show a tiny `4/5` chip, but it's computed client-side as "containers + 3 ad-hoc fields" — not the canonical 6-criteria score the backend already computes. | `MatchPanel.tsx` lines 663–669: `totalCriteria = woContainers.length + 3` ignores `date` and `route`. Backend uses 6. |
| 3 | **Criteria breakdown is hidden.** No way to see *which* of the 6 criteria failed without expanding the card and squinting at green/red dots. The actual mismatched values (e.g. "Nguyễn Văn A" vs "Nguyen Van A") are never shown side-by-side. | `MatchPanel.tsx` shows `<InlineField label="Khách hàng" value={tripClient}/>` — only the trip side, not the WO side, so user can't compare. |
| 4 | **Inline edit silently doesn't save.** Pencil → save on `Khách hàng` / `Điểm lấy` / `Điểm trả` updates local state but `handleMatch` only persists `route` and `containers`. User edits a typo, score appears to update, but database is unchanged → confusion next time the page reloads. | `MatchPanel.tsx` `handleMatch` lines 678–697: only `{ route, containers }` sent to update endpoint. `clientId`/`pickupLocationId`/`dropoffLocationId` ignored. |
| 5 | **No sort by score, no color cues.** Suggestions list relies on backend order with no visual ranking. A 5/6 match looks identical to a 2/6 match unless you read the tiny number. | All suggestion cards use the same neutral border & background. |
| 6 | **No bulk action.** If 20 work orders have a single 6/6 obvious match, user must click each one, expand, click "Xác nhận" — 20 round-trips. | No bulk-match endpoint, no banner. Auto-match dialog exists but is hidden behind a button & shows a separate modal flow. |
| 7 | **Filter row + month nav take a full row at the top.** Header is heavy: title + 2 buttons + month nav + filter toolbar all eat ~140px before any data is visible. | `WorkOrderList.tsx` lines 484–524. |
| 8 | **Count badge sometimes wrong.** `usePotentialMatchCounts` re-implements match logic client-side with a different threshold (≥ 2 fields including container) than backend (≥ 2/6 score). Shows different counts than the suggestions list. | Compare `matchCounts.get(wo.id)` vs `suggestions.length` after expand. |
| 9 | **Mobile + desktop have two divergent renders** with subtly different behaviour (mobile uses MonthNavigator on its own row, desktop crams it into the filter row). Maintenance hazard. | `isMobile` branch lines 404–481 vs 483–584. |

---

## 2. New design

### 2.1 Layout — master/detail 2-column on desktop, drawer on mobile

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Ghép chuyến                                  [Tự động ghép]  [Nhập đơn] │
├─────────────────────────────────────────────────────────────────────────────┤
│  ◀ 05/2026 ▶   🔍 Tìm…       [Tất cả] [Chờ khớp] [Hoàn thành]  ✨ N=12   │
├──────────────────────────────────┬──────────────────────────────────────────┤
│  PHIẾU CHUYẾN                    │  📋  Phiếu PCL-005-25  ·  15/09         │
│ ┌─────────────────────────────┐  │      KH ABC · HCM → HN · 10T · cont…    │
│ │ ✦ 5 PCL-005  15/09          │  │                                          │
│ │   ABC · HCM→HN  TINH1234    │  │  ┌──────────────────────────────────┐    │
│ │   Nguyễn Văn A · 51C-12345  │  │  │ ✨ 3 cặp 100% match — Ghép tất cả│    │
│ │                       [5/6] │  │  └──────────────────────────────────┘    │
│ ├─────────────────────────────┤  │                                          │
│ │ ✦ 4 PCL-006  15/09          │  │  ĐƠN HÀNG CÓ THỂ GHÉP                  │
│ │   ABC · HCM→HN              │  │  ┌──────────────────────────────────┐    │
│ │   Trần Văn B          [4/6] │  │  │ TO-2031  15/09           [6/6]✓ │    │
│ ├─────────────────────────────┤  │  │ ✓ Ngày  ✓ Tuyến  ✓ KH  ✓ Lấy   │    │
│ │ ✦ 3 PCL-008  16/09    [3/6] │  │  │ ✓ Trả  ✓ Container              │    │
│ │   …                         │  │  │            [Ghép cặp này] [Bỏ] │    │
│ │                             │  │  ├──────────────────────────────────┤    │
│ │                             │  │  │ TO-2032  15/09           [4/6]  │    │
│ │                             │  │  │ ✓ Ngày  ✓ Tuyến                 │    │
│ │                             │  │  │ ✗ Tài xế: A vs Nguyen Van A 🖉 │    │
│ │                             │  │  │ ✗ Container: TINH1234 vs        │    │
│ │                             │  │  │              TINH 1234       🖉 │    │
│ │                             │  │  │            [Ghép cặp này]      │    │
│ │                             │  │  └──────────────────────────────────┘    │
│ └─────────────────────────────┘  │                                          │
└──────────────────────────────────┴──────────────────────────────────────────┘
```

Mobile: list stays full-width; tapping a row pushes a full-screen drawer with the detail panel (back button to return).

### 2.2 Master list — left column (compact)

Each row:

* **Score chip on the left** (44×44, color-coded): `5/6` huge & bold. Visible from across the room.
* Date + WO code (mono) on top
* Client + route on second line
* Driver + plate on third line (truncate)
* Status badge on the right (Chờ khớp / Hoàn thành), small.
* Hover: subtle bg highlight; selected row gets a 3px brand-color left border + tinted bg.
* Sort default: `status='PENDING'` first, then potential-score DESC, then date DESC.

Background color of score chip:

| Score | Color | Meaning |
| - | - | - |
| 6/6 | `--theme-status-success` (green) | Auto-matchable |
| 4–5 / 6 | `--theme-status-warning` (yellow/amber) | Likely match, fix 1–2 fields |
| 2–3 / 6 | `--theme-status-warning` muted (orange) | Worth checking |
| 0–1 / 6 | `--theme-text-muted` (grey) | Probably no match |

The "score" on a master row is the **best** score among its current suggestions (we already have this server-side).

### 2.3 Detail panel — right column

**Top: Trip detail card** (compact — single card, no editing):

```
┌────────────────────────────────────────────────────────────┐
│  📋 PCL-005-25         15/09/2026         🚛 51C-12345    │
│  Khách: ABC Logistics   Tài xế: Nguyễn Văn A              │
│  HCM → HN     E20 TINH1234   E40 SOMU5678                 │
└────────────────────────────────────────────────────────────┘
```

**Bulk-match banner** (only when ≥ 2 perfect 6/6 matches exist for this WO OR globally for the filtered list):

```
✨  Có 3 cặp 100% match — Ghép tất cả ngay
```

Banner clicks → confirm dialog → POST `/reconcile/bulk-match` → invalidate.

**Suggestion list** (sort: score DESC):

Each match card shows:

```
┌─────────────────────────────────────────────────────────┐
│  TO-2032  15/09                                  [4/6]  │
│  ─────────────────────────────────────────────────────  │
│  ✓ Ngày đi      15/09 ↔ 15/09                          │
│  ✓ Tuyến        HCM→HN ↔ HCM→HN                        │
│  ✓ Khách hàng   ABC ↔ ABC                              │
│  ✗ Điểm lấy     Cảng Cát Lái ↔ Cát Lái            🖉  │
│  ✗ Container    TINH1234 ↔ TINH 1234              🖉  │
│  ✓ Điểm trả     Kho HN ↔ Kho HN                        │
│                                                          │
│        [✓ Ghép cặp này]           [Bỏ qua]              │
└─────────────────────────────────────────────────────────┘
```

* Each criterion is one row: `<icon> <label> <wo-value> ↔ <to-value> <pencil>`.
* Green check + tinted bg if matched. Red X + neutral bg if mismatched.
* Pencil button on the right of mismatched rows. Editable inline:
  * **Container number** — text input (the most common typo case).
  * **Route** — text input (free-form string).
  * **Client / Pickup / Dropoff / Date** — open a small popover with a typeahead (clients, locations) or date input. We already expose those FK ids via existing `/clients` and `/locations` endpoints.
* On save → mutate the side that has the typo (we infer: if user clicked the pencil on the WO column we update the WO; if they clicked on the TO column we update the TO; for now we let them pick which side).
* Score recomputes after react-query invalidates the suggestions query.
* `Ghép cặp này` button — primary, disabled if score < some-min (we keep min ≥ 2/6 same as current backend).
* `Bỏ qua` — small secondary; for v1 it just collapses/hides this card client-side (no backend "dismiss" yet).

### 2.4 Filter row

Single thin sticky bar above the two columns:

```
◀ 05/2026 ▶   🔍 Tìm mã, biển số, container…   [Chờ khớp] [Hoàn thành] [Tất cả]   ✨ N
```

* Month navigator left, search center (flex-1), status chips right, count chip far right.
* All inside one 48px row.
* Search filters the master list only; selected row stays selected if still in filtered list.

### 2.5 Empty / loading / no-match states

| State | UI |
| - | - |
| No work orders yet (clean install) | "Chưa có phiếu chuyến" + CTA "Nhập đơn" |
| Filter returns 0 | "Không có phiếu nào khớp bộ lọc" + Clear button |
| Master loading | 3 skeleton rows |
| Detail panel — no WO selected | Full-height empty state: 📋 icon + "Chọn một phiếu để xem các đơn hàng có thể ghép" |
| Detail panel — WO selected, suggestions loading | 2 skeleton match cards |
| Detail panel — WO selected, 0 suggestions | "Không tìm thấy đơn hàng phù hợp" + tip "Kiểm tra ngày, tuyến đường, hoặc container" + button "Tạo đơn mới" |

---

## 3. Implementation plan — 8 commits

| # | Type | Subject | Files |
| - | - | - | - |
| 1 | docs | design v2 redesign of trip matching UX | `frontend/docs/work-orders-redesign-2026-05-09.md` |
| 2 | feat (backend) | expose match score + per-criteria breakdown | `match_suggester.py`, `schemas/domain.py` |
| 3 | refactor (frontend) | switch to master-detail 2-column layout | `WorkOrderList.tsx`, new `MatchDetailPanel.tsx` |
| 4 | feat (frontend) | show trip detail card in detail panel header | `MatchDetailPanel.tsx`, new `TripDetailCard.tsx` |
| 5 | feat (frontend) | show match score and criteria checklist per match | new `MatchCard.tsx` |
| 6 | feat (frontend) | inline edit mismatched fields to fix typos | `MatchCard.tsx` |
| 7 | feat (backend+frontend) | bulk match endpoint + banner for 100% matches | `reconcile.py` router + `MatchDetailPanel.tsx` |
| 8 | style (frontend) | color-code badges + sort by score, polish empty states + filter row | `WorkOrderList.tsx`, `MatchCard.tsx` |

Each commit:
- runs `pnpm tsc --noEmit` clean
- runs `python -c "from app.main import app"` clean (import smoke test)
- one logical change, no drive-by refactor
- screenshots or before/after note in commit body where visual

---

## 4. Out of scope (next iteration)

* Persistent "dismiss" of a match (backend support needed).
* Driver / vehicle as a 7th criterion in the score.
* Rich location/client typeahead in the inline edit popover (v1 = plain text + manual save).
* Real-time updates via WebSocket.
* Undo last match.

---

**Author:** Claude · **Date:** 2026-05-09
