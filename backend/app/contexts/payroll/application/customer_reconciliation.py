"""Customer reconciliation import use cases.

Workflow:
  1. **Parse (external)** — the frontend or a future Excel parser converts
     a customer-provided file into ``CustomerReconciliationRowInput`` rows.
  2. **Preview** — for each row, look up the matching ``TripOrder`` by
     ``(partner_id, container_number, trip_date)``. Persist the import
     plus all rows with ``resolved_trip_order_id`` filled in. Status =
     ``PARSED``.
  3. **Commit** — mark the import as ``APPLIED``. No operational state
     mutation happens here yet: the accountant treats the import as a
     ledger of customer verdicts and acts on rejections manually. (Auto
     match/unmatch on commit can be layered on later.)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    CustomerReconciliationImport,
    CustomerReconciliationRow,
    Partner,
    TripOrder,
    TripOrderContainer,
)


VALID_STATUSES = {"MATCHED", "REJECTED", "UNKNOWN"}

_VI_TO_EN = {
    "KHỚP": "MATCHED",
    "KHÓP": "MATCHED",
    "TỪ_CHỐI": "REJECTED",
    "TỪ_CHỐI": "REJECTED",
    "TỪ CHỐI": "REJECTED",
    "TỪ CHỐI": "REJECTED",
    "KHÔNG_RÕ": "UNKNOWN",
    "KHÔNG RÕ": "UNKNOWN",
    "KHÔNGRO": "UNKNOWN",
}


def normalize_customer_status(raw: str) -> str:
    raw = raw.strip().upper()
    if raw in VALID_STATUSES:
        return raw
    mapped = _VI_TO_EN.get(raw)
    if mapped:
        return mapped
    without_spaces = raw.replace(" ", "_")
    if without_spaces in VALID_STATUSES:
        return without_spaces
    mapped = _VI_TO_EN.get(without_spaces)
    if mapped:
        return mapped
    raise ValueError(
        f"Invalid customer_status {raw!r}; "
        f"expected one of {sorted(VALID_STATUSES)} or Vietnamese: KHỚP, TỪ_CHỐI, KHÔNG_RÕ"
    )


@dataclass
class ParsedRow:
    container_number: str | None
    trip_date: date | None
    customer_status: str
    customer_note: str | None = None


@dataclass
class PreviewInput:
    partner_id: int
    period_start: date
    period_end: date
    source_filename: str | None
    rows: list[ParsedRow]
    uploaded_by: int | None = None


@dataclass
class ResolvedRowDTO:
    id: int
    container_number: str | None
    trip_date: date | None
    customer_status: str
    customer_note: str | None
    resolved_trip_order_id: int | None
    apply_status: str
    apply_message: str | None


@dataclass
class ImportSummary:
    total: int = 0
    matched: int = 0
    rejected: int = 0
    unknown: int = 0
    resolved: int = 0
    unresolved: int = 0


@dataclass
class ImportDTO:
    id: int
    partner_id: int
    partner_name: str | None
    period_start: date
    period_end: date
    source_filename: str | None
    status: str
    summary: dict
    uploaded_at: datetime
    applied_at: datetime | None
    rows: list[ResolvedRowDTO] = field(default_factory=list)


async def _resolve_trip_order_id(
    session: AsyncSession,
    *,
    partner_id: int,
    container_number: str | None,
    trip_date: date | None,
) -> int | None:
    """Find the TO id whose container matches container_number on the given date.

    Returns None when the container_number is missing or no match is found.
    """
    if not container_number:
        return None

    stmt = (
        select(TripOrder.id)
        .join(
            TripOrderContainer,
            TripOrderContainer.trip_order_id == TripOrder.id,
        )
        .where(
            TripOrder.partner_id == partner_id,
            TripOrderContainer.container_number == container_number,
        )
    )
    if trip_date is not None:
        stmt = stmt.where(TripOrder.trip_date == trip_date)
    stmt = stmt.limit(1)

    return (await session.execute(stmt)).scalars().first()


class PreviewCustomerReconciliationImport:
    """Persist a parsed reconciliation upload and resolve each row to a TO."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def __call__(self, payload: PreviewInput) -> ImportDTO:
        for r in payload.rows:
            r.customer_status = normalize_customer_status(r.customer_status)

        # Verify partner exists.
        partner = (
            await self.session.execute(
                select(Partner).where(Partner.id == payload.partner_id)
            )
        ).scalar_one_or_none()
        if partner is None:
            raise ValueError(f"Partner {payload.partner_id} not found")

        summary = ImportSummary(total=len(payload.rows))

        imp = CustomerReconciliationImport(
            partner_id=payload.partner_id,
            period_start=payload.period_start,
            period_end=payload.period_end,
            source_filename=payload.source_filename,
            status="PARSED",
            summary=None,
            uploaded_by=payload.uploaded_by,
        )
        self.session.add(imp)
        await self.session.flush()  # populate imp.id

        resolved_rows: list[CustomerReconciliationRow] = []
        for r in payload.rows:
            resolved_id = await _resolve_trip_order_id(
                self.session,
                partner_id=payload.partner_id,
                container_number=r.container_number,
                trip_date=r.trip_date,
            )

            if r.customer_status == "MATCHED":
                summary.matched += 1
            elif r.customer_status == "REJECTED":
                summary.rejected += 1
            else:
                summary.unknown += 1

            if resolved_id is not None:
                summary.resolved += 1
                apply_status = "PENDING"
                apply_message = None
            else:
                summary.unresolved += 1
                apply_status = "UNRESOLVED"
                apply_message = "Không tìm thấy chuyến khớp container + ngày"

            row = CustomerReconciliationRow(
                import_id=imp.id,
                container_number=r.container_number,
                trip_date=r.trip_date,
                customer_status=r.customer_status,
                customer_note=r.customer_note,
                resolved_trip_order_id=resolved_id,
                apply_status=apply_status,
                apply_message=apply_message,
            )
            self.session.add(row)
            resolved_rows.append(row)

        imp.summary = {
            "total": summary.total,
            "matched": summary.matched,
            "rejected": summary.rejected,
            "unknown": summary.unknown,
            "resolved": summary.resolved,
            "unresolved": summary.unresolved,
        }
        await self.session.commit()

        for row in resolved_rows:
            await self.session.refresh(row)
        await self.session.refresh(imp)

        return ImportDTO(
            id=imp.id,
            partner_id=imp.partner_id,
            partner_name=partner.name,
            period_start=imp.period_start,
            period_end=imp.period_end,
            source_filename=imp.source_filename,
            status=imp.status,
            summary=imp.summary or {},
            uploaded_at=imp.uploaded_at,
            applied_at=imp.applied_at,
            rows=[
                ResolvedRowDTO(
                    id=row.id,
                    container_number=row.container_number,
                    trip_date=row.trip_date,
                    customer_status=row.customer_status,
                    customer_note=row.customer_note,
                    resolved_trip_order_id=row.resolved_trip_order_id,
                    apply_status=row.apply_status,
                    apply_message=row.apply_message,
                )
                for row in resolved_rows
            ],
        )


class CommitCustomerReconciliationImport:
    """Mark a parsed import as APPLIED.

    For Phase 1 this is a state-only transition: the accountant uses
    the import as a worksheet, and acts on rejected rows manually via
    the normal match/unmatch endpoints. Future work: optionally trigger
    auto-unmatch for ``REJECTED`` rows whose resolved TO is currently
    MATCHED.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def __call__(self, *, import_id: int, applied_by: int | None) -> ImportDTO:
        imp = await self.session.get(CustomerReconciliationImport, import_id)
        if imp is None:
            raise ValueError(f"CustomerReconciliationImport {import_id} not found")
        if imp.status == "APPLIED":
            raise ValueError("Import already applied")

        imp.status = "APPLIED"
        imp.applied_at = datetime.now(timezone.utc)
        imp.applied_by = applied_by

        # Mark previously PENDING resolved rows as APPLIED for clarity.
        rows = (
            await self.session.execute(
                select(CustomerReconciliationRow).where(
                    CustomerReconciliationRow.import_id == import_id
                )
            )
        ).scalars().all()
        for row in rows:
            if row.apply_status == "PENDING":
                row.apply_status = "APPLIED"

        await self.session.commit()
        return await _load_import_dto(self.session, imp.id)


class ListCustomerReconciliationImports:
    """List recent imports, optionally filtered by partner."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def __call__(
        self, *, partner_id: int | None = None, limit: int = 50
    ) -> list[ImportDTO]:
        stmt = (
            select(CustomerReconciliationImport, Partner.name)
            .join(Partner, Partner.id == CustomerReconciliationImport.partner_id)
            .order_by(CustomerReconciliationImport.uploaded_at.desc())
            .limit(limit)
        )
        if partner_id is not None:
            stmt = stmt.where(CustomerReconciliationImport.partner_id == partner_id)

        rows = (await self.session.execute(stmt)).all()
        out: list[ImportDTO] = []
        for imp, partner_name in rows:
            out.append(
                ImportDTO(
                    id=imp.id,
                    partner_id=imp.partner_id,
                    partner_name=partner_name,
                    period_start=imp.period_start,
                    period_end=imp.period_end,
                    source_filename=imp.source_filename,
                    status=imp.status,
                    summary=imp.summary or {},
                    uploaded_at=imp.uploaded_at,
                    applied_at=imp.applied_at,
                    rows=[],  # exclude row detail in list view
                )
            )
        return out


class GetCustomerReconciliationImport:
    """Load one import with its full row detail."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def __call__(self, *, import_id: int) -> ImportDTO:
        return await _load_import_dto(self.session, import_id)


async def _load_import_dto(session: AsyncSession, import_id: int) -> ImportDTO:
    imp = await session.get(CustomerReconciliationImport, import_id)
    if imp is None:
        raise ValueError(f"CustomerReconciliationImport {import_id} not found")

    partner = await session.get(Partner, imp.partner_id)

    rows = (
        await session.execute(
            select(CustomerReconciliationRow)
            .where(CustomerReconciliationRow.import_id == import_id)
            .order_by(CustomerReconciliationRow.id)
        )
    ).scalars().all()

    return ImportDTO(
        id=imp.id,
        partner_id=imp.partner_id,
        partner_name=partner.name if partner else None,
        period_start=imp.period_start,
        period_end=imp.period_end,
        source_filename=imp.source_filename,
        status=imp.status,
        summary=imp.summary or {},
        uploaded_at=imp.uploaded_at,
        applied_at=imp.applied_at,
        rows=[
            ResolvedRowDTO(
                id=r.id,
                container_number=r.container_number,
                trip_date=r.trip_date,
                customer_status=r.customer_status,
                customer_note=r.customer_note,
                resolved_trip_order_id=r.resolved_trip_order_id,
                apply_status=r.apply_status,
                apply_message=r.apply_message,
            )
            for r in rows
        ],
    )
