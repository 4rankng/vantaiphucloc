from app.contexts.payroll.interface.routers.salary import router as salary_router
from app.contexts.payroll.interface.routers.salary_config import (
    router as salary_config_router,
)

__all__ = ["salary_config_router", "salary_router"]
