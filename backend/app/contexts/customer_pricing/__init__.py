"""Customer & Pricing bounded context.

Owns the master data (customers/clients, locations, location_aliases,
vendors, routes) and the tariff data (pricings, pricing_lines).

BizLogic.md §9.1 originally split these across two contexts ("Catalog"
and "Pricing") but the import workflow couples them tightly — every
tariff row references customer + lane + container_type — so they are
realized as a single bounded context for now. Re-splitting later is a
file move and does not need a domain-model change.

See `domain/` for pure-Python aggregates, `application/` for use cases,
`infrastructure/` for SQLAlchemy ORM + concrete repos, `interface/` for
FastAPI routers + Pydantic schemas.
"""
