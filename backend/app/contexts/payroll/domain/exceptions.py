"""Payroll domain exceptions."""

from __future__ import annotations


class PayrollDomainError(Exception):
    pass


class SalaryPeriodNotFound(PayrollDomainError):
    pass


class InvalidSalaryConfig(PayrollDomainError):
    pass
