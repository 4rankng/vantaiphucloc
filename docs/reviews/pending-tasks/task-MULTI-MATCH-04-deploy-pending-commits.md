# MULTI-MATCH-04 — Deploy Pending Backend Commits to Production

**Severity:** 🟡 Major (blocks verification of fixes)
**Type:** Deployment
**Layer:** Ops
**Affected Role/Flow:** All users on `phucloc.tingting.vip`
**Status:** ❌ Open

---

## Issue

Local branch `main` is **10 commits ahead of `origin/main`** and not deployed. The multi-match backend work (commits `9107b4b..fbfe576`, tasks 0090–0098) is staged but not pushed.

Additionally, per `CLAUDE.md`, an earlier QA v8 deployment (commit `705d7eb`, tasks 0059–0062) was also marked as deploy-pending.

This means even after the FE fixes in `MULTI-MATCH-01`, `02`, `03` are merged, the backend on prod may still:
- Crash with `MultipleResultsFound` on `find_link()` for WOs with 2+ active links (fixed in `9107b4b`).
- Overwrite (not accumulate) salary when matching 2nd TO to same WO (fixed in `507eb7a`).
- Reject unmatch on multi-linked WO due to the wrong dto field validation (fixed in `2b97ece`).

---

## Recommendation

```bash
cd /Users/dev/Documents/projects/vantaiphucloc

# 1. Push first
git push origin main

# 2. Deploy
make push-all && make deploy-all

# 3. Smoke test on phucloc.tingting.vip
#    - Match 1 WO with 2 TOs via the FE flow (after MULTI-MATCH-01..03 fixes land)
#    - Verify badge "2 ĐH" appears on WO
#    - Unmatch 1 TO — verify other TO remains linked, salary updates correctly
#    - Re-run pytest suite locally first if possible:
#        cd backend && pytest tests/integration/test_multi_match_reconciliation.py -v
```

---

## Acceptance Criteria

- [ ] `git push origin main` succeeds.
- [ ] `make push-all && make deploy-all` finishes without error.
- [ ] `pytest backend/tests/integration/test_multi_match_reconciliation.py` returns 9/9 pass locally before deploy.
- [ ] On `https://phucloc.tingting.vip`: a WO with 2 active reconciliation links displays `2 ĐH` badge (not a 500 error).
- [ ] Driver earnings page reflects accumulated salary from all linked TOs on a multi-match WO.

---

## Related

- See `docs/plans/multi-match-chuyen-don-hang-tasklist.md` for full backend change list.
- See `CLAUDE.md` "Recently Completed" section.
