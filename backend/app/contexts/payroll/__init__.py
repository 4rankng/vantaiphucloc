"""Payroll bounded context.

Owns salary-related settings (stored in the generic ``settings`` key-value
table) and driver earnings calculations.  Earnings are computed on-the-fly
from matched work orders.
"""
