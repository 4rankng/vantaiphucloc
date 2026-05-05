"""Operations application layer.

Use cases that orchestrate trip-order / work-order aggregates.
Currently empty — landing in a follow-up commit. The legacy
`app/api/v1/{trip_orders,work_orders,reconcile,imports}.py` +
`app/services/{trip_order_service,work_order_service,
matching_service,state_machine,import_pipeline}.py` paths still serve
production traffic.
"""
