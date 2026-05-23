"""Vendor Excel import: parse vendor file, create DeliveredTrips, auto-match."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.application.bulk_import_types import ImportRow
from app.contexts.operations.infrastructure.import_pipeline.pipeline import run_preview
from app.models.domain import (
    BookedTrip as BookedTripORM,
    Client,
    DeliveredTrip as DeliveredTripORM,
    Location,
    LocationAlias,
)

_logger = logging.getLogger(__name__)


def _parse_iso_date(val: str | None) -> date | None:
    if not val:
        return None
    from datetime import datetime
    try:
        return datetime.strptime(val, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def _parse_revenue(val: float | None) -> int | None:
    if val is None:
        return None
    v = int(val)
    return v if v > 0 else None


@dataclass
class ReconciliationImportResult:
    total_rows: int = 0
    created: int = 0
    matched: int = 0
    fraud_skipped: int = 0
    errors: list[str] = field(default_factory=list)
    details: list[dict] = field(default_factory=list)


class ReconciliationImportService:
    """Parse Excel, create DeliveredTrips, auto-match against BookedTrips."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def import_reconciliation_excel(
        self,
        content: bytes,
        filename: str,
        vendor_id: int | None = None,
        driver_id: int | None = None,
    ) -> ReconciliationImportResult:
        # Use the sophisticated pipeline (sheet scoring, multi-row headers,
        # pattern detection) instead of the simple ExcelParser.
        try:
            preview = await run_preview(
                content, filename, default_trip_date=date.today(),
            )
        except ValueError as exc:
            return ReconciliationImportResult(
                total_rows=0,
                errors=[str(exc)],
            )

        # Convert PreviewResult rows to ImportRow format
        rows: list[ImportRow] = []
        for item in preview.accepted:
            v = item.get("values") or {}
            rows.append(ImportRow(
                row_number=item.get("source_row_index", 0) + 1,
                container_number=v.get("container_no"),
                trip_date=_parse_iso_date(v.get("trip_date")),
                client_name=v.get("consignee") or v.get("customer_ref"),
                pickup_location=v.get("pickup_location"),
                dropoff_location=v.get("dropoff_location"),
                amount=_parse_revenue(v.get("freight_charge")),
                cont_type=v.get("cont_type") or "E20",
                vehicle_plate=v.get("vehicle_plate"),
            ))

        # Collect rejected rows as errors
        error_msgs: list[str] = []
        for r in preview.rejected:
            raw_desc = r.get("raw", {})
            reasons = r.get("reasons", [])
            row_idx = r.get("source_row_index", 0) + 1
            error_msgs.append(f"Dòng {row_idx}: {', '.join(reasons)}")

        valid = [r for r in rows if r.container_number]
        all_errors = error_msgs

        if not valid:
            return ReconciliationImportResult(
                total_rows=len(rows) + len(preview.rejected),
                errors=all_errors or ["Không tìm thấy dữ liệu hợp lệ trong file"],
            )

        # Pre-load locations for resolution
        await self._resolve_locations(valid)

        # Load unmatched booked trips (for auto-match)
        unmatched_booked = await self._load_unmatched_booked_trips(valid)

        result = ReconciliationImportResult(total_rows=len(rows) + len(preview.rejected))

        for row in valid:
            try:
                trip_id = await self._create_reconciliation_trip(row, vendor_id, driver_id)
                result.created += 1

                # Auto-match by container number
                match_info = await self._try_auto_match(
                    trip_id, row.container_number, unmatched_booked,
                )
                detail = {
                    "row": row.row_number,
                    "container": row.container_number,
                    "delivered_trip_id": trip_id,
                    "match_status": match_info,
                }

                if match_info == "matched":
                    result.matched += 1
                elif match_info == "fraud_skipped":
                    result.fraud_skipped += 1

                result.details.append(detail)
            except Exception as exc:
                msg = f"Dòng {row.row_number}: {exc}"
                result.errors.append(msg)
                result.details.append({
                    "row": row.row_number,
                    "container": row.container_number,
                    "match_status": "error",
                    "error": str(exc),
                })

        await self.session.commit()
        result.errors = all_errors + result.errors
        return result

    async def _resolve_locations(self, rows: list[ImportRow]) -> None:
        names: set[str] = set()
        for r in rows:
            if r.pickup_location:
                names.add(r.pickup_location)
            if r.dropoff_location:
                names.add(r.dropoff_location)
        if not names:
            return

        locations = (await self.session.execute(select(Location))).scalars().all()
        aliases = (await self.session.execute(select(LocationAlias))).scalars().all()

        name_to_id: dict[str, int] = {}
        for loc in locations:
            name_to_id[loc.name.strip().lower()] = loc.id
        for alias in aliases:
            name_to_id[alias.alias_normalized.strip().lower()] = alias.location_id

        for r in rows:
            for attr, val in (("pickup_location", r.pickup_location),
                              ("dropoff_location", r.dropoff_location)):
                if not val:
                    continue
                key = val.strip().lower()
                loc_id = name_to_id.get(key)
                if loc_id is None:
                    for loc in locations:
                        if key in loc.name.lower() or loc.name.lower() in key:
                            loc_id = loc.id
                            break
                if attr == "pickup_location":
                    r._pickup_location_id = loc_id  # type: ignore[attr-defined]
                else:
                    r._dropoff_location_id = loc_id  # type: ignore[attr-defined]

    async def _resolve_client(self, client_name: str | None) -> int:
        if not client_name:
            raise ValueError("Không có tên khách hàng trong file")
        client = (await self.session.execute(
            select(Client).where(Client.name.ilike(f"%{client_name.strip()}%"))
        )).scalar_one_or_none()
        if client is None:
            raise ValueError(f"Không tìm thấy khách hàng '{client_name}'")
        return client.id

    async def _load_unmatched_booked_trips(
        self, rows: list[ImportRow],
    ) -> dict[str, BookedTripORM]:
        containers = {
            r.container_number.upper().replace(" ", "")
            for r in rows if r.container_number
        }
        if not containers:
            return {}

        q = select(BookedTripORM).where(
            BookedTripORM.matched == False,  # noqa: E712
            BookedTripORM.cont_number.isnot(None),
        )
        booked = (await self.session.execute(q)).scalars().all()

        return {
            b.cont_number.upper().replace(" ", ""): b
            for b in booked
            if b.cont_number and b.cont_number.upper().replace(" ", "") in containers
        }

    async def _create_reconciliation_trip(
        self, row: ImportRow, vendor_id: int | None, driver_id: int | None,
    ) -> int:
        pickup_id = getattr(row, "_pickup_location_id", None)
        dropoff_id = getattr(row, "_dropoff_location_id", None)

        if not pickup_id or not dropoff_id:
            missing = "lấy" if not pickup_id else "trả"
            name = row.pickup_location if not pickup_id else row.dropoff_location
            raise ValueError(
                f"Không tìm thấy điểm {missing} '{name}' trong hệ thống"
            )

        # Resolve client by name
        client_id = await self._resolve_client(row.client_name)

        wo = DeliveredTripORM(
            client_id=client_id,
            pickup_location_id=pickup_id,
            dropoff_location_id=dropoff_id,
            driver_id=driver_id,
            vendor_id=vendor_id,
            vehicle_plate=row.vehicle_plate or "",
            vessel=row.notes if row.notes and ("tau" in row.notes.lower() or "tàu" in row.notes.lower()) else None,
            work_type="CHUYỂN BÃI",
            cont_number=row.container_number,
            cont_type=row.cont_type or "E20",
            trip_date=row.trip_date,
            matched=False,
            revenue=0,
            driver_salary=row.amount or 0,
            allowance=0,
        )
        self.session.add(wo)
        await self.session.flush()
        return int(wo.id)  # type: ignore[arg-type]

    async def _try_auto_match(
        self,
        delivered_trip_id: int,
        container_number: str | None,
        unmatched_booked: dict[str, BookedTripORM],
    ) -> str:
        if not container_number:
            return "no_container"

        key = container_number.upper().replace(" ", "")
        booked_orm = unmatched_booked.get(key)
        if booked_orm is None:
            return "no_match"

        # Fraud check: booked trip already matched by another process
        if booked_orm.matched:
            return "fraud_skipped"

        # Match both sides
        booked_orm.matched = True

        delivered_orm = (await self.session.execute(
            select(DeliveredTripORM).where(DeliveredTripORM.id == delivered_trip_id)
        )).scalar_one_or_none()
        if delivered_orm:
            delivered_orm.matched = True

        await self.session.flush()

        # Remove from unmatched map to prevent double-matching
        del unmatched_booked[key]

        return "matched"
