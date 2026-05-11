# Task 0061: Ghép chuyến — "Tuyến đường" comparison row always shows "—"

**Type:** Bug
**Layer:** Backend
**Severity:** Medium
**Affected Role/Flow:** Kế toán — Ghép chuyến (work order matching panel)

## Description

In the match detail panel (right side of the Ghép chuyến page), the "Tuyến đường" criterion row in the comparison breakdown always shows "—" on both the Work Order side and the Trip Order side, even when pickup and dropoff locations are correctly populated and shown in the adjacent "Điểm lấy" and "Điểm trả" rows.

Root cause confirmed in backend code:

`backend/app/contexts/operations/infrastructure/match_suggester.py`, lines 300–301:
```python
wo_route=None,
to_route=None,
```

Both `wo_route` and `to_route` are **hardcoded to `None`** in the `_build_criteria()` call inside `suggest_trip_matches()`. The "Tuyến đường" field is never populated, so it always renders as "—" in the UI.

## Steps to Reproduce

1. Login as ketoan / admin123
2. Navigate to Ghép chuyến
3. Click any work order card (e.g. W001002)
4. In the right panel, observe the "Tuyến đường" row in the criteria breakdown

## Expected

The "Tuyến đường" row should show the combined route string (e.g. "Hiệp Phước → Cát Lái") for both the Work Order and the Trip Order, allowing the accountant to visually compare routes.

## Actual

"Tuyến đường" shows "— ↔ —" for every work order/trip pair.

## Fix Hint

In `match_suggester.py`, populate `wo_route` and `to_route` by combining the pickup and dropoff location names that are already loaded:

```python
wo_route = f"{wo_pickup_name} → {wo_dropoff_name}" if wo_pickup_name and wo_dropoff_name else None,
to_route = f"{get_location_summary(locations, to.pickup_location_id).name} → {get_location_summary(locations, to.dropoff_location_id).name}" if to.pickup_location_id and to.dropoff_location_id else None,
```

File: `backend/app/contexts/operations/infrastructure/match_suggester.py` lines ~296–314
