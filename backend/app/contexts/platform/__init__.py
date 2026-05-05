"""Platform / cross-cutting interface context.

Hosts read-only routers that span multiple bounded contexts: dashboard
summaries (operations + customer + fleet) and audit-log readout (cross-
cutting). No domain layer — these are pure presentation views.
"""
