# Simplify Match Comparison to Single Column — Pending Task Spec
**Date:** 2026-05-12
**For:** Next SWE pickup
**Priority:** P2 (UX polish)
**Effort:** ~0.5-1 dev-day

## Problem
Comparison panel hiện hiển thị BOTH trip value AND order value cho mỗi criterion row với `↔` arrow:
```
Khách hàng: Công ty TNHH HAP ↔ Công ty TNHH HAP
Điểm lấy: Bình Dương ↔ Bình Dương
```

Chuyến đã đi đã có detail card ở top of section. Repeat trip value mỗi row là redundant visual noise → khó scan đơn hàng value (mới).

## Proposed
Single-column layout showing chỉ order value với ✅/❌ icon:
```
[✅] Khách hàng: Công ty TNHH HAP
[✅] Điểm lấy: Bình Dương
[✅] Điểm trả: Đồng Nai
[❌] Ngày đi: 2026-05-09          (subtle red bg)
[❌] Container: F20 TCNU8658158   (subtle red bg)
```

✅/❌ icon đã indicate match/mismatch vs chuyến ở top. Mismatched rows tô subtle background.

Optional: hover/tap mismatched row → tooltip show "Chuyến đi: <trip value>" cho on-demand compare.

## Tasks Checklist
- [ ] **T-001** [P0]: Refactor JSX render — remove trip value column, keep only order value + status icon
- [ ] **T-002** [P0]: Subtle red bg for mismatched rows (e.g. `bg-red-50/50`)
- [ ] **T-003** [P1]: Tooltip hover/tap mismatched row → show trip value
- [ ] **T-004** [P1]: Counter "X khớp · Y chưa khớp" subtle ở bottom

## Acceptance Criteria
- [ ] Mỗi criterion row chỉ show 1 value (đơn hàng) + ✅/❌ icon
- [ ] Mismatched rows visually distinguishable (subtle bg color)
- [ ] User vẫn biết mismatch là gì vs chuyến (via top card hoặc tooltip)
- [ ] Score chip ở top unchanged
- [ ] Match flow (Ghép button) unchanged

## Files Likely Changed
- Frontend: `MatchDetailPanel.tsx` chủ yếu (JSX refactor)
- Có thể touch CSS file nếu dùng styled-components / Tailwind utility classes

## Dependencies
- Should ship AFTER "Remove Tuyến đường" task (5 criteria thay vì 6) cho consistency
- Independent of "Split multi-container" — both can ship parallel
