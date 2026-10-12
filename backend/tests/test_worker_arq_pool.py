"""Regression tests for the arq pool lifecycle in the worker process.

The worker runs outside the API lifespan, so ``WorkerSettings.on_startup``
must initialize the shared pool — otherwise any worker-side re-enqueue (OCR
429 retry, slots-full requeue) crashes with "RuntimeError: arq pool not
initialized" and the affected jobs get marked failed.
"""

import pytest

from app.core import worker as core_worker
from app.workers.worker import WorkerSettings


class _FakeArqRedis:
    def __init__(self, pool_or_conn=None):
        self.pool_or_conn = pool_or_conn
        self.closed = False

    async def ping(self):
        return True

    async def aclose(self):
        self.closed = True


@pytest.mark.asyncio
async def test_worker_on_startup_initializes_arq_pool(monkeypatch):
    """After on_startup, get_arq_pool() must return a usable pool instead of
    raising RuntimeError. on_shutdown must close and clear it again."""
    monkeypatch.setattr(core_worker, "ArqRedis", _FakeArqRedis)
    monkeypatch.setattr(core_worker, "_build_pool", lambda: object())
    assert core_worker._arq_pool is None

    try:
        await WorkerSettings.on_startup({})
        pool = core_worker.get_arq_pool()
        assert isinstance(pool, _FakeArqRedis)
    finally:
        await WorkerSettings.on_shutdown({})

    assert core_worker._arq_pool is None
    assert pool.closed is True
