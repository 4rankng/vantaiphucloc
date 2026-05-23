# Remove `matched` boolean from DeliveredTrip — use `booked_trip_id` FK as source of truth

## Goal
Drop `matched` column from `delivered_trips` table. Derive match status from `booked_trip_id IS NOT NULL`.
Remove `matched` from API response entirely — frontend derives from `bookedTripId`.

## Backend
- [x] Migration: drop `matched` column + index from `delivered_trips`
- [x] ORM model: remove `matched` from `DeliveredTrip` in `domain.py`
- [x] Domain entity: replace `matched: bool` with `booked_trip_id` + computed `matched` property (internal use)
- [x] Mappers: map `booked_trip_id` instead of `matched`
- [x] Repository: replace `matched == True/False` with `booked_trip_id` checks, remove `set_matched_bulk`
- [ ] DTOs + Schemas: remove `matched` from Update + Out, expose `booked_trip_id` in Out
- [ ] Auto-match service + unmatch endpoint: set `booked_trip_id` instead of `matched`
- [ ] Delivered trips router: remove `matched=body.matched`, output `booked_trip_id`
- [ ] Dashboard: replace all `DeliveredTrip.matched` filters with `booked_trip_id` checks
- [ ] Excel exports + vendor import + identity repos: update all `matched` references
- [ ] Delivered trips use case: update matched-write logic
- [ ] Gate: `make test-backend`

## Frontend
- [ ] Domain type: remove `matched`, keep `bookedTripId`
- [ ] API types: remove `matched` from filters/update, update sort type
- [ ] Components: replace `trip.matched` with `!!trip.bookedTripId` everywhere
- [ ] Gate: `make test-frontend`
