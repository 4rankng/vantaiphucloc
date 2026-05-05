"""Bounded contexts (DDD).

Per BizLogic.md §9, the system is organized into bounded contexts. Each
context owns its tables, its language, and a clear external contract.

Within each context the layer rules are:
- domain: pure Python — entities, value objects, repository ABCs, domain
  services, domain exceptions. No SQLAlchemy / FastAPI / Pydantic /
  openpyxl imports.
- application: use cases, DTOs, ports. Knows transactions; contains no
  business rules.
- infrastructure: SQLAlchemy ORM + concrete repositories + adapters for
  external services. Implements domain ABCs.
- interface: FastAPI routers + Pydantic schemas. Calls use cases, never
  repositories directly.

Dependencies point inward only: domain ← application ← infrastructure,
domain ← application ← interface. Domain imports nothing project-internal.
"""
