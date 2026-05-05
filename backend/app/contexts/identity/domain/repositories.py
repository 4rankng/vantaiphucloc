"""Repository abstract interfaces for the Identity context.

Concrete implementations live in infrastructure. Use cases depend only on
these ABCs — never on infrastructure types.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from app.contexts.identity.domain.entities import PushSubscription, User
from app.contexts.identity.domain.value_objects import Endpoint, UserId, UserRole


class UserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: UserId) -> User | None: ...

    @abstractmethod
    async def find_by_phone(self, phone: str) -> User | None: ...

    @abstractmethod
    async def find_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def find_by_username(self, username: str) -> User | None: ...

    @abstractmethod
    async def find_by_cccd(self, cccd: str) -> User | None: ...

    @abstractmethod
    async def find_by_identifier(self, identifier: str) -> User | None:
        """Match by phone OR email OR username."""

    @abstractmethod
    async def list(
        self,
        *,
        offset: int,
        limit: int,
        role_filter: UserRole | None,
        exclude_role: UserRole | None,
    ) -> tuple[Sequence[User], int]:
        """Returns (items, total) for pagination."""

    @abstractmethod
    async def add(self, user: User) -> User:
        """Persist a new user, return the user with id assigned."""

    @abstractmethod
    async def save(self, user: User) -> User:
        """Persist changes to an existing user."""

    @abstractmethod
    async def has_active_unmatched_work_orders(self, user_id: UserId) -> bool:
        """Check if a driver has active work orders (cross-context read).

        Returning bool keeps the Operations context's data shape opaque to
        the Identity domain — the SQL lives in infrastructure.
        """


class PushSubscriptionRepository(ABC):
    @abstractmethod
    async def find_by_endpoint(self, endpoint: Endpoint) -> PushSubscription | None: ...

    @abstractmethod
    async def add(self, sub: PushSubscription) -> PushSubscription: ...

    @abstractmethod
    async def save(self, sub: PushSubscription) -> PushSubscription: ...

    @abstractmethod
    async def delete_by_user_and_endpoint(
        self, user_id: UserId, endpoint: Endpoint
    ) -> None: ...
