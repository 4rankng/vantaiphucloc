# TTransport Review — Task Priority Summary

Generated: 2026-05-13
Source: Explorer scan (glm-4.7-flash) → DeepSeek V4 Pro review

## Priority Order

### 🔴 Critical (do first)
1. **BUG-0110** — Stale MATCHED auto-heal in GET handler (race condition, data corruption risk)
2. **TASK-0119** — Location alias management UI (matching effectively disabled without it)

### 🟡 Major (do next)
3. **BUG-0111** — Duplicate enum definitions diverged (MATCHED/CONFIRMED missing)
4. **BUG-0112** — trip_date fallback inconsistency in match suggester (missed matches)
5. **BUG-0113** — DriverSummary missing fullName/phone (broken across 5 audits)
6. **BUG-0114** — Users endpoint 403 for ketoan (broken across 5 audits)
7. **BUG-0115** — Container validation bypass in import pipeline
8. **TASK-0117** — Low-confidence match confirmation dialog
9. **TASK-0118** — Manual search fallback for 0 candidates

### 🟢 Minor (do when convenient)
10. **TASK-0116** — Remove dead code and consolidate seed scripts

## Skipped (already archived or trivial)
- UX-OPEN-03 (auto-match toast) — nice to have, not blocking
- UX-OPEN-06/07/08/09/10/11 — polish items, not business-critical
- SECRET_KEY default — already validated in production mode
