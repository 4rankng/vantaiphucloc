"""Pure-Python tests for the Identity domain layer.

No DB, no FastAPI, no SQLAlchemy. These tests prove the layering rule:
the domain knows nothing about frameworks.
"""

from __future__ import annotations

import pytest

from app.contexts.identity.domain.entities import PushSubscription, User
from app.contexts.identity.domain.exceptions import (
    InactiveUser,
    InvalidCccd,
    InvalidCredentials,
    PermissionDenied,
    WrongCurrentPassword,
)
from app.contexts.identity.domain.services import PasswordHasher
from app.contexts.identity.domain.value_objects import (
    Endpoint,
    PushSubscriptionId,
    UserId,
    UserRole,
    validate_cccd,
)


# ── Test doubles (no infrastructure) ────────────────────────────────


class FakeHasher(PasswordHasher):
    def hash(self, plain: str) -> str:
        return f"hashed::{plain}"

    def verify(self, plain: str, hashed: str) -> bool:
        return hashed == f"hashed::{plain}"


@pytest.fixture
def hasher() -> PasswordHasher:
    return FakeHasher()


def _make_user(**overrides) -> User:
    base = dict(
        id=UserId(1),
        username="kt01",
        hashed_password="hashed::secret",
        role=UserRole.ACCOUNTANT,
        is_active=True,
        phone="0900000000",
    )
    base.update(overrides)
    return User(**base)


# ── value objects ───────────────────────────────────────────────────


class TestUserRole:
    def test_from_str_valid(self):
        assert UserRole.from_str("driver") is UserRole.DRIVER
        assert UserRole.from_str("superadmin") is UserRole.SUPERADMIN

    def test_from_str_unknown_raises(self):
        with pytest.raises(ValueError):
            UserRole.from_str("ceo")


class TestValidateCccd:
    def test_none_returns_none(self):
        assert validate_cccd(None) is None

    def test_empty_string_returns_none(self):
        assert validate_cccd("") is None

    def test_valid_cccd_passes(self):
        assert validate_cccd("123456789012") == "123456789012"

    @pytest.mark.parametrize(
        "bad", ["1", "12345678901", "12345678901a", "1234567890123"]
    )
    def test_invalid_cccd_raises(self, bad):
        with pytest.raises(InvalidCccd):
            validate_cccd(bad)


# ── User entity ─────────────────────────────────────────────────────


class TestUserAuthenticate:
    def test_authenticate_succeeds_with_correct_password(self, hasher):
        u = _make_user()
        u.authenticate("secret", hasher)  # no exception

    def test_authenticate_raises_invalid_credentials(self, hasher):
        u = _make_user()
        with pytest.raises(InvalidCredentials):
            u.authenticate("wrong", hasher)

    def test_authenticate_raises_when_inactive(self, hasher):
        u = _make_user(is_active=False)
        with pytest.raises(InactiveUser):
            u.authenticate("secret", hasher)


class TestUserChangePassword:
    def test_change_password_updates_hash(self, hasher):
        u = _make_user()
        u.change_password("secret", "newpw", hasher)
        assert u.hashed_password == "hashed::newpw"

    def test_wrong_current_password_raises(self, hasher):
        u = _make_user()
        with pytest.raises(WrongCurrentPassword):
            u.change_password("nope", "newpw", hasher)


class TestUserAssignRole:
    def test_director_cannot_promote_to_superadmin(self):
        u = _make_user(role=UserRole.ACCOUNTANT)
        with pytest.raises(PermissionDenied):
            u.assign_role(UserRole.SUPERADMIN, actor_role=UserRole.DIRECTOR)

    def test_superadmin_can_promote_to_superadmin(self):
        u = _make_user(role=UserRole.ACCOUNTANT)
        u.assign_role(UserRole.SUPERADMIN, actor_role=UserRole.SUPERADMIN)
        assert u.role is UserRole.SUPERADMIN


class TestUserActivation:
    def test_deactivate(self):
        u = _make_user(is_active=True)
        u.deactivate()
        assert u.is_active is False

    def test_activate(self):
        u = _make_user(is_active=False)
        u.activate()
        assert u.is_active is True


class TestUserCccdInvariant:
    def test_invalid_cccd_at_construction_raises(self):
        with pytest.raises(InvalidCccd):
            _make_user(cccd="abc")

    def test_valid_cccd_at_construction(self):
        u = _make_user(cccd="123456789012")
        assert u.cccd == "123456789012"


# ── PushSubscription ────────────────────────────────────────────────


class TestPushSubscription:
    def test_update_keys_changes_credentials(self):
        sub = PushSubscription(
            id=PushSubscriptionId(1),
            user_id=UserId(1),
            endpoint=Endpoint("https://push.example/abc"),
            p256dh="old_p256",
            auth="old_auth",
            user_agent="UA/1.0",
        )
        sub.update_keys(p256dh="new_p256", auth="new_auth", user_agent="UA/2.0")
        assert sub.p256dh == "new_p256"
        assert sub.auth == "new_auth"
        assert sub.user_agent == "UA/2.0"
