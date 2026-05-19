"""Billing bounded context.

Owns the customer-side money flow: settlement statements (BK SL Excel) and
payments. The settlement statement is a read aggregate composed from
operations data (BookedTrip/Container) + customer master (Client/Location).
"""
