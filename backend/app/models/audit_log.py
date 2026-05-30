"""AuditLog model — auto-records all data changes."""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(20), nullable=False, index=True)  # CREATE | UPDATE | CANCEL | CONFIRM | LOCK | MATCH | UNMATCH
    table_name = Column(String(100), nullable=False, index=True)
    record_id = Column(Integer, nullable=False)
    old_value = Column(Text, nullable=True)   # JSON string
    new_value = Column(Text, nullable=True)   # JSON string
    reason = Column(Text, nullable=True)      # Required for CANCEL / UNMATCH
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False, index=True)
