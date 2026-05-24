"""Tests for customer settlement — verifies schema post-migration."""

from app.models import domain


def test_no_reconciliation_table():
    assert not hasattr(domain, "Reconciliation")
