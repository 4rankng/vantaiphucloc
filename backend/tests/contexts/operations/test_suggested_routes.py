from datetime import datetime, timezone
from types import SimpleNamespace

from app.contexts.operations.interface.routers.suggested_routes import (
    _compute_suggestions,
)


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class _Session:
    def __init__(self, rows):
        self._rows = rows
        self.params = []

    async def execute(self, _statement, params):
        self.params.append(params)
        return _Result(self._rows if len(self.params) == 1 else [])


def _route(client_id, frequency, last_used):
    return SimpleNamespace(
        client_id=client_id,
        client_code=f"C{client_id}",
        client_name=f"Client {client_id}",
        pickup_location_id=client_id * 10,
        pickup_location_name=f"Pickup {client_id}",
        pickup_lat=None,
        pickup_lng=None,
        dropoff_location_id=client_id * 10 + 1,
        dropoff_location_name=f"Dropoff {client_id}",
        frequency=frequency,
        last_used=last_used,
    )


async def test_suggested_routes_are_newest_first_even_when_older_route_is_frequent():
    session = _Session(
        [
            _route(1, 20, datetime(2026, 5, 1, tzinfo=timezone.utc)),
            _route(2, 1, datetime(2026, 5, 3, tzinfo=timezone.utc)),
            _route(3, 5, datetime(2026, 5, 2, tzinfo=timezone.utc)),
        ]
    )

    items = await _compute_suggestions(
        session,
        driver_id=42,
        lat=None,
        lng=None,
        limit=2,
    )

    assert [item["client"]["id"] for item in items] == [2, 3]
    assert session.params[0]["limit"] == 6
