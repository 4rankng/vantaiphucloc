"""Lightweight Oso replacement — role-based authorization from policy rules.

Parses a simplified Polar-like policy file and evaluates ``allow(user, action, resource)``
using the same role-hierarchy rules.  No external dependency required.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any


# ── Rule representation ────────────────────────────────────────────────────────

class _Rule:
    """A single ``allow(user, action, resource)`` rule."""

    __slots__ = ("action", "resource", "min_role", "owner_check")

    def __init__(self, action: str, resource: str, min_role: str, owner_check: str | None = None):
        self.action = action
        self.resource = resource
        self.min_role = min_role
        self.owner_check = owner_check  # e.g. "user.id = resource.driver_id"


# ── Role hierarchy ─────────────────────────────────────────────────────────────

HIERARCHY: dict[str, set[str]] = {
    "superadmin": {"superadmin", "director", "accountant", "driver"},
    "director": {"director", "accountant", "driver"},
    "accountant": {"accountant", "driver"},
    "driver": {"driver"},
}


def _role_allows(user_role: str, required_role: str) -> bool:
    return required_role in HIERARCHY.get(user_role, set())


# ── Policy loader ──────────────────────────────────────────────────────────────

_ALLOW_RE = re.compile(
    r'allow\(\s*(_user|user)\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)\s*;'
    r'\s*if\s+role_allow\(\s*user\s*,\s*"([^"]+)"\s*\)'
)
_ALLOW_OWNER_RE = re.compile(
    r'allow\(\s*user\s*,\s*"([^"]+)"\s*,\s*\w+:\s*\w+\s*\)\s*if'
    r'\s+role_allow\(\s*user\s*,\s*"([^"]+)"\s*\)\s+and\s+(user\.\w+)\s*=\s*(\w+\.\w+)'
)
_ALLOW_ANY_RE = re.compile(
    r'allow\(\s*_user\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)'
)


class Policy:
    """In-memory authorization policy loaded from a Polar-like file."""

    def __init__(self, rules: list[_Rule], any_rules: list[tuple[str, str]]):
        self._rules = rules
        self._any_rules = any_rules  # (action, resource) pairs that allow any authenticated user

    @classmethod
    def from_file(cls, path: Path) -> Policy:
        rules: list[_Rule] = []
        any_rules: list[tuple[str, str]] = []
        text = path.read_text()
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # allow(_user, "read", "Dashboard");
            m = _ALLOW_ANY_RE.match(line)
            if m:
                any_rules.append((m.group(1), m.group(2)))
                continue
            # allow(user, "action", "Resource") if role_allow(user, "role");
            m = _ALLOW_RE.match(line)
            if m:
                rules.append(_Rule(action=m.group(2), resource=m.group(3), min_role=m.group(4)))
                continue
            # allow(user, "update", work_order: WorkOrder) if role_allow(...) and user.id = work_order.driver_id
            m = _ALLOW_OWNER_RE.match(line)
            if m:
                rules.append(_Rule(
                    action=m.group(1),
                    resource="WorkOrder",
                    min_role=m.group(2),
                    owner_check=f"{m.group(3)}={m.group(4)}",
                ))
                continue
        return cls(rules, any_rules)

    def is_allowed(self, user: Any, action: str, resource: Any) -> bool:
        user_role = getattr(user, "role", "")
        resource_name = resource if isinstance(resource, str) else type(resource).__name__

        # Check wildcard rules (any authenticated user)
        for a, r in self._any_rules:
            if a == action and r == resource_name:
                return True

        # Check role-based rules
        for rule in self._rules:
            if rule.action != action or rule.resource != resource_name:
                continue
            if _role_allows(user_role, rule.min_role):
                return True
            # Owner check: user.id = resource.driver_id
            if rule.owner_check:
                parts = rule.owner_check.split("=")
                if len(parts) == 2:
                    user_attr = parts[0].split(".")[1].strip()
                    res_attr = parts[1].split(".")[1].strip()
                    if getattr(user, user_attr, None) == getattr(resource, res_attr, None):
                        return True
        return False


# ── Singleton accessor (matches old ``get_oso`` API) ──────────────────────────

_policy: Policy | None = None


def get_oso() -> Policy:
    global _policy
    if _policy is None:
        policy_path = Path(__file__).resolve().parent.parent / "policy.polar"
        _policy = Policy.from_file(policy_path)
    return _policy
