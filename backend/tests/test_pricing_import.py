"""Tests for the customer-tariff (bảng giá) import pipeline.

Covers all three known customer formats using the sample files in `docs/`:
- PAN — `Trucking (HD)` sheet
- HAP — `CUOC` sheet
- NEWWAY — best-effort settlement-style data

Plus a commit/idempotency round-trip against an in-memory SQLite session.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import select

from app.models.domain import Partner, Pricing, PricingLine
from app.contexts.customer_pricing.infrastructure.pricing_import import (
    PricingPreview,
    SUPPORTED_FORMATS,
    TariffRow,
    commit_tariff_rows,
    detect_format,
    parse_tariff_bytes,
)


_DOCS = Path(__file__).resolve().parents[2] / "docs"
_PAN_FILE = _DOCS / "PAN- BK SL T04.26 (HD).xlsx"
_HAP_FILE = _DOCS / "Phúc Lộc - Shipside T4.26 HAP.xlsx"
_NEWWAY_FILE = _DOCS / "BẢNG KÊ SẢN LƯỢNG XE PL & NEWWAY THÁNG 04.2026(HECHUN).xlsx"


def _read(p: Path) -> bytes:
    if not p.exists():
        pytest.skip(f"Sample file missing: {p}")
    return p.read_bytes()


# ── detect_format ──────────────────────────────────────────────────


class TestDetectFormat:
    def test_pan(self):
        assert detect_format("PAN- BK SL T04.26 (HD).xlsx") == "pan"

    def test_hap(self):
        assert detect_format("Phúc Lộc - Shipside T4.26 HAP.xlsx") == "hap"

    def test_newway(self):
        assert (
            detect_format("BẢNG KÊ SẢN LƯỢNG XE PL & NEWWAY THÁNG 04.2026(HECHUN).xlsx")
            == "newway"
        )

    def test_unknown_returns_none(self):
        assert detect_format("random_file.xlsx") is None
        assert detect_format("") is None


# ── PAN parser ─────────────────────────────────────────────────────


class TestParsePAN:
    def test_returns_rows(self):
        preview = parse_tariff_bytes(_read(_PAN_FILE), "pan")
        assert isinstance(preview, PricingPreview)
        assert preview.format == "pan"
        assert preview.sheet_name == "Trucking (HD)"
        assert len(preview.rows) > 0

    def test_only_supported_work_types(self):
        preview = parse_tariff_bytes(_read(_PAN_FILE), "pan")
        for row in preview.rows:
            assert row.work_type in {"E20", "E40", "F20", "F40"}

    def test_unit_prices_positive(self):
        preview = parse_tariff_bytes(_read(_PAN_FILE), "pan")
        assert all(r.unit_price > 0 for r in preview.rows)

    def test_pickup_dropoff_present(self):
        preview = parse_tariff_bytes(_read(_PAN_FILE), "pan")
        with_both = [
            r for r in preview.rows if r.pickup_raw and r.dropoff_raw
        ]
        assert with_both, "Expected at least one PAN row with both pickup & dropoff"


# ── HAP parser ─────────────────────────────────────────────────────


class TestParseHAP:
    def test_returns_rows(self):
        preview = parse_tariff_bytes(_read(_HAP_FILE), "hap")
        assert preview.format == "hap"
        assert preview.sheet_name == "CUOC"
        assert len(preview.rows) > 0

    def test_only_supported_work_types(self):
        preview = parse_tariff_bytes(_read(_HAP_FILE), "hap")
        for row in preview.rows:
            assert row.work_type in {"E20", "E40", "F20", "F40"}

    def test_unit_prices_positive(self):
        preview = parse_tariff_bytes(_read(_HAP_FILE), "hap")
        assert all(r.unit_price > 0 for r in preview.rows)


# ── NEWWAY parser ──────────────────────────────────────────────────


class TestParseNEWWAY:
    """NEWWAY is best-effort — we only assert the shape, not row count.
    The sample file may produce 0 rows depending on its exact structure."""

    def test_runs_without_error(self):
        preview = parse_tariff_bytes(_read(_NEWWAY_FILE), "newway")
        assert preview.format == "newway"
        for row in preview.rows:
            assert row.work_type in {"E20", "E40", "F20", "F40"}
            assert row.unit_price > 0
        if not preview.rows:
            assert any("NEWWAY" in w for w in preview.warnings)


# ── parse_tariff_bytes — error handling ────────────────────────────


def test_parse_unsupported_format_raises():
    with pytest.raises(ValueError):
        parse_tariff_bytes(b"x", "unsupported_fmt")


def test_supported_formats_set():
    assert set(SUPPORTED_FORMATS) == {"pan", "hap", "newway"}


# ── Commit round-trip (DB) ─────────────────────────────────────────


@pytest.mark.asyncio
class TestCommitTariffRows:
    async def _seed_partner(self, db_session):
        partner = Partner(
            code="ACME",
            name="Acme",
            partner_type="client",
            phone="0900",
            is_active=True,
        )
        db_session.add(partner)
        await db_session.commit()
        await db_session.refresh(partner)
        return partner

    async def test_creates_pricing_and_line(self, db_session):
        partner = await self._seed_partner(db_session)
        rows = [
            TariffRow(
                pickup_raw="Cảng Hải Phòng",
                dropoff_raw="Khu công nghiệp X",
                work_type="F20",
                unit_price=1_500_000,
            )
        ]
        result = await commit_tariff_rows(
            db_session, client=partner, rows=rows, user_id=None
        )
        assert result.pricings_created == 1
        assert result.lines_created == 1

        pricing = (await db_session.execute(select(Pricing))).scalar_one()
        assert pricing.partner_id == partner.id
        assert pricing.work_type == "F20"

        line = (await db_session.execute(select(PricingLine))).scalar_one()
        assert line.pricing_id == pricing.id
        assert line.unit_price == 1_500_000
        assert line.quantity == 1

    async def test_idempotent_second_run_no_new_rows(self, db_session):
        partner = await self._seed_partner(db_session)
        rows = [
            TariffRow(
                pickup_raw="Cảng A",
                dropoff_raw="Kho B",
                work_type="F40",
                unit_price=2_000_000,
            )
        ]
        await commit_tariff_rows(db_session, client=partner, rows=rows, user_id=None)
        result = await commit_tariff_rows(
            db_session, client=partner, rows=rows, user_id=None
        )
        assert result.pricings_created == 0
        assert result.pricings_existing == 1
        assert result.lines_created == 0
        assert result.lines_existing == 1

    async def test_update_existing_line_when_flag_set(self, db_session):
        partner = await self._seed_partner(db_session)
        first = TariffRow(
            pickup_raw="Cảng A",
            dropoff_raw="Kho B",
            work_type="F20",
            unit_price=1_000_000,
        )
        await commit_tariff_rows(db_session, client=partner, rows=[first], user_id=None)
        updated = TariffRow(
            pickup_raw="Cảng A",
            dropoff_raw="Kho B",
            work_type="F20",
            unit_price=1_200_000,
        )
        result = await commit_tariff_rows(
            db_session,
            client=partner,
            rows=[updated],
            user_id=None,
            update_existing_lines=True,
        )
        assert result.lines_updated == 1
        line = (await db_session.execute(select(PricingLine))).scalar_one()
        assert line.unit_price == 1_200_000

    async def test_skips_rows_with_blank_pickup_or_dropoff(self, db_session):
        partner = await self._seed_partner(db_session)
        rows = [
            TariffRow(
                pickup_raw="", dropoff_raw="Kho B", work_type="F20",
                unit_price=1_000,
            ),
            TariffRow(
                pickup_raw="Cảng A", dropoff_raw="", work_type="F20",
                unit_price=1_000,
            ),
        ]
        result = await commit_tariff_rows(
            db_session, client=partner, rows=rows, user_id=None
        )
        assert result.skipped_no_locations == 2
        assert result.lines_created == 0
