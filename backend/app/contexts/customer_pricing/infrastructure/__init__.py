"""Customer & Pricing infrastructure layer.

SQLAlchemy ORM, mappers (ORM ↔ domain entity), and concrete
repositories. Other contexts FK to these tables by string name, so the
ORM definitions remain physically in `app.models.domain` for now and
this module re-exports them under `XxxORM` aliases — this keeps the
boundary discipline (use-cases never import from app.models.*) without
having to rewrite every consumer in one commit.
"""
