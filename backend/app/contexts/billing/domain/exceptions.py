"""Billing domain exceptions."""

from __future__ import annotations


class BillingDomainError(Exception):
    pass


class SettlementClientNotFound(BillingDomainError):
    """The customer referenced by a settlement export does not exist."""
