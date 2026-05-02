"""Mixin for auto-auditable models."""


class AuditableMixin:
    """Add to models that should be auto-audited on CREATE/UPDATE/DELETE.

    Usage:
        class Client(AuditableMixin, Base):
            __tablename__ = "clients"
            ...
    """
    __auditable__ = True
    __audit_exclude_fields__: set[str] = {'updated_at', 'created_at'}
