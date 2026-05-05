"""Push subscription use cases."""

from __future__ import annotations

from app.contexts.identity.application.dto import PushRegisterInput
from app.contexts.identity.domain.entities import PushSubscription
from app.contexts.identity.domain.repositories import PushSubscriptionRepository
from app.contexts.identity.domain.value_objects import Endpoint, UserId


class RegisterPushSubscription:
    """Idempotent on (endpoint). If an existing record is found we update keys."""

    def __init__(self, subs: PushSubscriptionRepository) -> None:
        self._subs = subs

    async def execute(self, cmd: PushRegisterInput) -> PushSubscription:
        endpoint = Endpoint(cmd.endpoint)
        existing = await self._subs.find_by_endpoint(endpoint)
        if existing is not None:
            existing.update_keys(
                p256dh=cmd.p256dh, auth=cmd.auth, user_agent=cmd.user_agent
            )
            return await self._subs.save(existing)
        new_sub = PushSubscription(
            id=None,
            user_id=UserId(cmd.user_id),
            endpoint=endpoint,
            p256dh=cmd.p256dh,
            auth=cmd.auth,
            user_agent=cmd.user_agent,
        )
        return await self._subs.add(new_sub)


class UnregisterPushSubscription:
    def __init__(self, subs: PushSubscriptionRepository) -> None:
        self._subs = subs

    async def execute(self, *, user_id: int, endpoint: str) -> None:
        await self._subs.delete_by_user_and_endpoint(
            UserId(user_id), Endpoint(endpoint)
        )
