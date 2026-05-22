"""Reconciliation router — aggregates all sub-routers."""

from fastapi import APIRouter

from .core import router as core_router
from .suggestions import router as suggestions_router
from .auto_match import router as auto_match_router
from .scores import router as scores_router
from .excel import router as excel_router
from .bulk import router as bulk_router

router = APIRouter()
router.include_router(core_router)
router.include_router(suggestions_router)
router.include_router(auto_match_router)
router.include_router(scores_router)
router.include_router(excel_router)
router.include_router(bulk_router)
