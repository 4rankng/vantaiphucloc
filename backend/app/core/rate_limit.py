from __future__ import annotations

import time

from fastapi import HTTPException
from redis.asyncio import Redis


class RateLimiter:
    def __init__(self, redis: Redis):
        self._redis = redis

    async def is_limited(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        window_start = now - window_seconds
        pipe = self._redis.pipeline()
        member = f"{key}:{now}"
        pipe.zadd(f"rl:{key}", {member: now})
        pipe.zremrangebyscore(f"rl:{key}", "-inf", window_start)
        pipe.zcard(f"rl:{key}")
        pipe.expire(f"rl:{key}", window_seconds)
        results = await pipe.execute()
        count = results[2]
        return count > max_requests

    async def check(self, key: str, max_requests: int, window_seconds: int) -> None:
        if await self.is_limited(key, max_requests, window_seconds):
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(window_seconds)},
            )
