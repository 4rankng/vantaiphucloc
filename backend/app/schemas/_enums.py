from __future__ import annotations

from enum import Enum

__all__ = ["WorkType"]


class WorkType(str, Enum):
    E20 = "E20"
    E40 = "E40"
    F20 = "F20"
    F40 = "F40"
