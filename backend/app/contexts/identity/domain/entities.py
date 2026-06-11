"""Identity-context entities and aggregate roots.

Pure Python. No SQLAlchemy, FastAPI, or Pydantic. Aggregate roots enforce
their invariants in their own methods, not in services.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from app.utils.dates import utcnow

from app.contexts.identity.domain.exceptions import (
    InactiveUser,
    InvalidCredentials,
    PermissionDenied,
    WrongCurrentPassword,
)
from app.contexts.identity.domain.value_objects import (
    Endpoint,
    PushSubscriptionId,
    UserId,
    UserRole,
    validate_cccd,
)




@dataclass
class User:
    """User aggregate root.

    Login by phone, email, or username — any of them are unique when set.
    Vehicle assignment is handled through the Vehicle ORM model.
    """

    id: UserId | None
    username: str
    hashed_password: str
    role: UserRole
    is_active: bool = True
    phone: str | None = None
    email: str | None = None
    full_name: str | None = None
    cccd: str | None = None
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)

    def __post_init__(self) -> None:
        self.cccd = validate_cccd(self.cccd)

    # ── Authentication ──────────────────────────────────────────────

    def authenticate(self, plain_password: str, hasher: "PasswordHasher") -> None:  # type: ignore[name-defined]
        """Raise on invalid password or inactive account."""
        if not hasher.verify(plain_password, self.hashed_password):
            raise InvalidCredentials("Invalid credentials")
        if not self.is_active:
            raise InactiveUser("Account is deactivated")

    def change_password(
        self, current: str, new: str, hasher: "PasswordHasher"  # type: ignore[name-defined]
    ) -> None:
        if not hasher.verify(current, self.hashed_password):
            raise WrongCurrentPassword("Current password is incorrect")
        self.hashed_password = hasher.hash(new)
        self.updated_at = utcnow()

    def reset_password(self, new: str, hasher: "PasswordHasher") -> None:  # type: ignore[name-defined]
        """Privileged reset — no current-password check. Used by admin-only flows."""
        self.hashed_password = hasher.hash(new)
        self.updated_at = utcnow()

    # ── Profile ─────────────────────────────────────────────────────

    def update_profile(
        self,
        *,
        full_name: str | None = None,
        phone: str | None = None,
        username: str | None = None,
        email: str | None = None,
        cccd: str | None = None,
    ) -> None:
        if full_name is not None:
            self.full_name = full_name
        if phone is not None:
            self.phone = phone
        if username is not None:
            self.username = username
        if email is not None:
            self.email = email
        if cccd is not None:
            self.cccd = validate_cccd(cccd)
        self.updated_at = utcnow()

    def deactivate(self) -> None:
        self.is_active = False
        self.updated_at = utcnow()

    def activate(self) -> None:
        self.is_active = True
        self.updated_at = utcnow()

    def assign_role(self, new_role: UserRole, *, actor_role: UserRole) -> None:
        """Director cannot promote anyone to superadmin."""
        if actor_role is UserRole.DIRECTOR and new_role is UserRole.SUPERADMIN:
            raise PermissionDenied("Directors cannot promote users to superadmin")
        self.role = new_role
        self.updated_at = utcnow()

    # ── Authorization helpers ───────────────────────────────────────

    @property
    def is_driver(self) -> bool:
        return self.role is UserRole.DRIVER

    @property
    def is_accountant(self) -> bool:
        return self.role is UserRole.ACCOUNTANT

    @property
    def is_superadmin(self) -> bool:
        return self.role is UserRole.SUPERADMIN

    @property
    def is_director(self) -> bool:
        return self.role is UserRole.DIRECTOR


@dataclass
class PushSubscription:
    """Web Push subscription. One user can have many devices."""

    id: PushSubscriptionId | None
    user_id: UserId
    endpoint: Endpoint
    p256dh: str
    auth: str
    user_agent: str | None = None
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)

    def update_keys(self, *, p256dh: str, auth: str, user_agent: str | None) -> None:
        self.p256dh = p256dh
        self.auth = auth
        self.user_agent = user_agent
        self.updated_at = utcnow()
