"""Pure-Python unit tests for the Operations application layer."""

from __future__ import annotations



from app.contexts.operations.application.dto import DeliveredTripListFilters


class TestDeliveredTripListFilters:
    def test_default_filters(self):
        f = DeliveredTripListFilters()
        assert f.client_id is None
        assert f.vendor_id is None
        assert f.matched is None
        assert f.search is None

    def test_vendor_id_filter(self):
        f = DeliveredTripListFilters(vendor_id=5)
        assert f.vendor_id == 5

    def test_matched_filter(self):
        f = DeliveredTripListFilters(matched=True)
        assert f.matched is True
