# UX-OPEN-01 — Manual Ghép Allows Low-Confidence Matches With No Confirmation

**Severity:** 🟡 Major  
**Type:** Usability Issue  
**Layer:** Frontend  
**Affected Role/Flow:** ketoan — `/accountant/work-orders` — Ghép chuyến match panel  
**Status:** ✅ Already Implemented — MatchTrip.tsx has `lowConfConfirm` state (lines 203-209) requiring confirmation for partial matches, plus toast notifications via `handleMatchWithToast` (lines 191-201). QA v9 likely tested stale deployment.

---

## Issue

Clicking "Ghép" on a 2/6 or 3/6 score match succeeds instantly with no confirmation dialog.  
No warning about mismatched fields (wrong date, wrong container, wrong route).  
No audit-trail reason required.

**QA v9 evidence:** Clicked Ghép on work order W001015 (score 3/6) — action completed immediately, no dialog, no toast. Work order count dropped from 20 → 19 silently.

This will be the dominant source of bad reconciliations as volumes grow.

---

## Expected Behavior

- When match score < 5/6: show a confirmation dialog listing each mismatched field (e.g., "Date mismatch: work order 03/04 vs trip order 05/04")
- Require a free-text reason from the accountant before allowing confirm
- Log the reason to the audit trail alongside the match event
- For score ≥ 5/6: allow direct confirm without dialog (fast path)
- Always show a success toast ("Đã ghép thành công") or error toast after any Ghép action

---

## Recommendation

1. Add a `score` threshold check before calling the match API (frontend guard)
2. Show `ConfirmMatchDialog` component when score < 5/6, listing mismatched fields from the suggestion payload
3. Pass `reason` field in the match API request body; store in `audit_log`
4. Add toast notification on match success/failure regardless of score
