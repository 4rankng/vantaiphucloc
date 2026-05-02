from pathlib import Path

from oso import Oso

from app.models.base import User
from app.models.domain import WorkOrder

_oso: Oso | None = None


def get_oso() -> Oso:
    global _oso
    if _oso is None:
        _oso = Oso()
        _oso.register_class(User)
        _oso.register_class(WorkOrder)
        policy_path = Path(__file__).resolve().parent.parent / "policy.polar"
        _oso.load_files([str(policy_path)])
    return _oso
