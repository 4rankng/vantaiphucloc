from app.contexts.payroll.interface.routers.customer_reconciliation import (
    router as customer_reconciliation_router,
)
from app.contexts.payroll.interface.routers.salary import router as salary_router
from app.contexts.payroll.interface.routers.salary_config import (
    router as salary_config_router,
)

__all__ = [
    "customer_reconciliation_router",
    "salary_config_router",
    "salary_router",
]
