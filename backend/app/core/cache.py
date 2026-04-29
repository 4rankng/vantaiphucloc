from __future__ import annotations

import json
import logging
from typing import Any

from redis.asyncio import Redis

from app.config import settings

logger = logging.getLogger(__name__)


class CacheManager:
    def __init__(self, redis: Redis):
        self._redis = redis

    def _key(self, namespace: str, identifier: str) -> str:
        return f"cache:{namespace}:{identifier}"

    async def get(self, namespace: str, identifier: str) -> str | None:
        return await self._redis.get(self._key(namespace, identifier))

    async def set(
        self,
        namespace: str,
        identifier: str,
        value: str,
        ttl: int | None = None,
    ) -> None:
        ttl = ttl if ttl is not None else settings.CACHE_DEFAULT_TTL
        await self._redis.set(self._key(namespace, identifier), value, ex=ttl)

    async def delete(self, namespace: str, identifier: str) -> None:
        await self._redis.delete(self._key(namespace, identifier))

    async def get_json(self, namespace: str, identifier: str) -> Any | None:
        raw = await self.get(namespace, identifier)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Invalid JSON in cache key %s", self._key(namespace, identifier))
            return None

    async def set_json(
        self,
        namespace: str,
        identifier: str,
        value: Any,
        ttl: int | None = None,
    ) -> None:
        await self.set(namespace, identifier, json.dumps(value, default=str), ttl=ttl)

    async def invalidate_namespace(self, namespace: str) -> None:
        pattern = f"cache:{namespace}:*"
        cursor = 0
        while True:
            cursor, keys = await self._redis.scan(cursor, match=pattern, count=100)
            if keys:
                await self._redis.delete(*keys)
            if cursor == 0:
                break
