from sqlalchemy import Boolean, Column, Integer, String

from app.database import Base


class OperationType(Base):
    """Configurable work/operation types (tác nghiệp)."""

    __tablename__ = "operation_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # e.g. "ĐÓNG KHO"
    label = Column(String(50), nullable=False)  # e.g. "Đóng kho"
    is_active = Column(Boolean, nullable=False, default=True)
