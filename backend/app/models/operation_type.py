from app.utils.dates import utcnow

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from app.database import Base


class OperationType(Base):
    """Configurable work/operation types (tác nghiệp)."""

    __tablename__ = "operation_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # e.g. "ĐÓNG KHO"
    label = Column(String(50), nullable=False)  # e.g. "Đóng kho"
    is_active = Column(Boolean, nullable=False, default=True)


class OperationTypeAlias(Base):
    """Alternative name for an OperationType. Primary name is operation_types.name."""

    __tablename__ = "operation_type_aliases"

    id = Column(Integer, primary_key=True, index=True)
    operation_type_id = Column(
        Integer,
        ForeignKey("operation_types.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alias = Column(String(255), nullable=False)
    alias_normalized = Column(String(255), nullable=False, unique=True)
    source = Column(
        String(30), nullable=False, index=True
    )  # "manual" | "import_auto" | "promote" | "migration_seed"
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    created_by_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
