"""Customer & Pricing application layer.

Use cases that orchestrate domain entities and repositories. They know
about transactions but contain no business rules — those live on
aggregates in the domain layer.

Currently extracted: Customer (full CRUD). Other aggregates (Vendor,
Location, Pricing, Route) still use the legacy `app/api/v1/...` +
`app/repositories/...` + `app/services/...` paths and will migrate in
follow-up commits — see the §9.7 note in BizLogic.md.
"""

from app.contexts.customer_pricing.application.customers import (
    CreateCustomer,
    DeleteCustomer,
    GetCustomer,
    ListCustomers,
    UpdateCustomer,
)

__all__ = [
    "CreateCustomer",
    "DeleteCustomer",
    "GetCustomer",
    "ListCustomers",
    "UpdateCustomer",
]
