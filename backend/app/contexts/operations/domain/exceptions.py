"""Domain exceptions for the Operations context."""

from __future__ import annotations


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


class AlreadyMatched(OperationsError):
    """Tried to match a trip that is already matched."""

    def __init__(self, kind: str, ident: object) -> None:
        super().__init__(f"{kind} {ident!r} is already matched")
        self.kind = kind
        self.ident = ident

