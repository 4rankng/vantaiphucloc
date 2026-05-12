# TASK-0116: Remove dead code and consolidate seed scripts

## Severity: Minor
## Area: backend
## Files: `backend/app/fix_trip_dates.py`, `backend/app/fix_trip_pricing.py`, `backend/app/seed*.py`, `backend/app/contexts/operations/infrastructure/match_suggester.py` (_score_to_against_wo)

### Problem
1. `fix_trip_dates.py` and `fix_trip_pricing.py` are one-off migration scripts in the app directory
2. 4 separate seed files: `seed.py`, `seed_client_data.py`, `seed_demo.py`, `seed_dev.py`
3. `_score_to_against_wo()` in match_suggester.py (line 645) is unused after per-container refactor

### Solution
1. Move fix_*.py to `scripts/` or delete if already applied
2. Consolidate seed files into `scripts/seed.py` with `--mode` flag (dev/demo/client)
3. Remove `_score_to_against_wo` function from match_suggester.py
4. Remove `backend/app/schemas/` if fully superseded by context-specific schemas

### Acceptance Criteria
- [ ] No migration scripts in app root
- [ ] Single seed entry point with mode flag
- [ ] No unused functions in match_suggester.py
- [ ] `go build` / app still starts clean
