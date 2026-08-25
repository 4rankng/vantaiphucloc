---
title: Doi-soat export chronological sort
date: 2026-08-25
summary: Reconciliation Excel now sorts by trip date then driver-recorded time so second-batch exports are cuttable
---

# Doi-soat export chronological sort

## What happened
- Accountant reported the "Xuất file đối soát" Excel (GET /booked-trips/export-doi-soat → generate_doi_soat_excel) did not read in time order: old sort key was (trip_date, client_id, cont_number, source_id), so same-day rows ordered alphabetically by container number while the NGÀY ĐI column shows driver-recorded HH:MM — a second export of the same pay period gave no visual cut point for the next batch to send the customer.
- Fix: sort key in backend/app/contexts/operations/infrastructure/excel/booked_trip_export.py is now (trip_date, _recorded_sort_time, client_id, cont_number, source_id). _recorded_sort_time returns (0, UTC-normalized ISO) for rows with driver_recorded_at (DeliveredTrip.created_at) and (1, "") for booked-only rows, so untimed rows follow timed rows of the same date. Naive timestamps treated as UTC, mirroring _format_doi_soat_trip_datetime.
- Existing test test_doi_soat_export_all_clients_does_not_cross_match_same_container asserted the old incidental order ["KHA","KHB"]; under the new sort the delivered/timed row (KHB) correctly precedes the booked-only row (KHA) — assertion flipped with a comment. The business assertions (no cross-client match, both "Chưa ghép") are unchanged.
- Verification: 6/6 tests pass in backend/tests/test_doi_soat_export.py (incl. new test_doi_soat_export_rows_sorted_by_trip_date_then_recorded_time), 58 passed/1 xfailed in tests/contexts/operations/, ruff check + format clean. Independent code-review pass: all checks passed; no contract changes (signature, endpoint, columns unchanged — only row order).

## Decision
- Sort by NGÀY ĐI (trip_date + recorded HH:MM), not by created_at globally: keeps the sheet date-grouped and matches the displayed column; new trips land at their chronological position so the tail of the file is the newest work.
- Booked-only rows (no recorded time) sort after timed rows of the same date — pending work sinks to the end of its day. Visible behavior change for client_id=None ("Tất cả chủ hàng") exports: same-date rows interleave across clients by time instead of grouping by client.

## Next steps
- Deploy backend to take effect in prod (not deployed from this session).
- If the accountant prefers booked-only rows before timed rows (or client grouping in all-clients exports), adjust the _recorded_sort_time bucket order — the assertion flip in the cross-match test is load-bearing for whichever order is chosen.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
