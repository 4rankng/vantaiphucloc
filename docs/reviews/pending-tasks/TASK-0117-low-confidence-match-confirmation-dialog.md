# TASK-0117: Add low-confidence match confirmation dialog (UX-OPEN-01)

## Severity: Major
## Area: fullstack
## Files: MatchDetailPanel.tsx, match/unmatch backend endpoint

### Problem
Clicking "Ghép" on a low-confidence match (score < 4/5) succeeds instantly with no confirmation dialog. No warning about mismatched fields (wrong date, wrong container, wrong route). No audit-trail reason required. This is the dominant source of bad reconciliations as volumes grow.

### Solution
1. Frontend: When match score < 4/5, show confirmation dialog listing mismatched criteria
2. Dialog requires user to type a reason (free text, logged to audit trail)
3. Backend: Add optional `reason` field to match endpoint, store in reconciliation audit
4. For score ≥ 4/5, skip dialog (auto-confirm as before)

### Acceptance Criteria
- [ ] Score < 4/5 → confirmation dialog with mismatched fields listed
- [ ] User must confirm (not auto-ghép)
- [ ] Reason text stored in reconciliation record
- [ ] Score ≥ 4/5 → no dialog, direct match
