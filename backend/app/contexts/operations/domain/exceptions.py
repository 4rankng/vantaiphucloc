"""Domain exceptions for the Operations context.

Translation to HTTP responses lives in `interface/error_translation.py`
once the interface layer lands.
"""

from __future__ import annotations

from app.contexts.operations.domain.value_objects import (
    TripOrderStatus,
    WorkOrderStatus,
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
    """Uniqueness violation (e.g., duplicate TripOrder code)."""

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
        current: TripOrderStatus | WorkOrderStatus | str,
        attempted: TripOrderStatus | WorkOrderStatus | str,
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


class TripOrderLocked(OperationsError):
    """Cannot modify a locked TripOrder."""

    def __init__(self, msg: str = "TripOrder is locked") -> None:
        super().__init__(msg)
