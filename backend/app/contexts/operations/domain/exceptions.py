"""Domain exceptions for the Operations context."""

from __future__ import annotations

from app.contexts.operations.domain.value_objects import (
    BookedTripStatus,
    DeliveredTripStatus,
)


class OperationsError(Exception):
    """Base exception for the context."""


class NotFound(OperationsError):
    """Aggregate not found."""

    def __init__(self, kind: str, ident: object) -> None:
        super().__init__(f"{kind} not found: {ident!r}")
        self.kind = kind
        self.ident = ident


class AlreadyExists(OperationsError):
    """Uniqueness violation."""

    def __init__(self, kind: str, key: object) -> None:
        super().__init__(f"{kind} already exists: {key!r}")
        self.kind = kind
        self.key = key


class InvalidStateTransition(OperationsError):
    """Tried a status change the state machine forbids."""

    def __init__(
        self,
        *,
        kind: str,
        current: BookedTripStatus | DeliveredTripStatus | str,
        attempted: BookedTripStatus | DeliveredTripStatus | str,
    ) -> None:
        super().__init__(
            f"{kind}: invalid transition {current!s} → {attempted!s}"
        )
        self.kind = kind
        self.current = current
        self.attempted = attempted


class ContainerCountInvalid(OperationsError):
    """Container count violates work-type rules (e.g., F40 must be 1, F20 ≤ 2)."""

    def __init__(self, work_type: str, count: int) -> None:
        super().__init__(
            f"work_type={work_type!s} does not permit count={count}"
        )
        self.work_type = work_type
        self.count = count
