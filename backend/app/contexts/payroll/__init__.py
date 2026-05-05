"""Payroll bounded context.

Owns `salary_periods` and the singleton `salary_period_configs`. The
"salary period" aggregate models a driver's pay window (configurable
26th→25th by default) plus its calculated totals.
"""
