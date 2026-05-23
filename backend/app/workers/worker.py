import logging

from arq import cron
from arq.connections import RedisSettings

from app.config import settings



from app.workers.tasks.salary import calculate_salary_task
from app.workers.tasks.notifications import send_notification_task
from app.workers.tasks.geocoding import geocode_location_task
from app.workers.tasks.reports import generate_monthly_report_task
from app.workers.tasks.earning_sync import sync_wo_earning_on_to_update

logger = logging.getLogger(__name__)


class WorkerSettings:
    functions = [
        calculate_salary_task,
        send_notification_task,
        generate_monthly_report_task,
        geocode_location_task,
        sync_wo_earning_on_to_update,
    ]
    cron_jobs = []


    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_tries = settings.WORKER_MAX_TRIES
    timeout = settings.WORKER_TIMEOUT

    @staticmethod
    async def on_startup(ctx: dict) -> None:
        logger.info("Worker started")

    @staticmethod
    async def on_shutdown(ctx: dict) -> None:
        from app.database import engine
        await engine.dispose()
        logger.info("Worker stopped")

    @staticmethod
    async def on_job_start(ctx: dict) -> None:
        logger.info("Job started: %s", ctx.get("job_id"))

    @staticmethod
    async def on_job_end(ctx: dict) -> None:
        logger.info("Job ended: %s", ctx.get("job_id"))
