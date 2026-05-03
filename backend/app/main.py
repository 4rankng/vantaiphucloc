from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import Response as StarletteResponse

from app.config import settings
from app.api.v1.router import router as api_v1_router
from app.core.redis import init_redis, close_redis
from app.core.worker import init_arq_pool, close_arq_pool
from app.database import engine

MAX_REQUEST_BODY_BYTES = 5_242_880  # 5 MB


class RequestSizeLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(
            (k.decode(), v.decode())
            for k, v in scope.get("headers", [])
        )
        if scope["method"] in ("POST", "PUT", "PATCH"):
            content_length = headers.get("content-length")
            if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
                response = StarletteResponse(
                    status_code=413,
                    content="Request body too large",
                )
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.validate_production()
    await init_redis()
    await init_arq_pool()
    # Register auto-audit session events
    from app.services.audit_service import register_audit_events
    register_audit_events()
    yield
    await close_arq_pool()
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title="Vận tải hàng hóa API",
    description="Freight/Logistics management backend",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(RequestSizeLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_v1_router, prefix="/api/v1")

_photos_root = Path(settings.PHOTO_STORAGE_ROOT)
_photos_root.mkdir(parents=True, exist_ok=True)
app.mount("/photos", StaticFiles(directory=str(_photos_root)), name="photos")


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/")
async def root():
    return {"message": "Vận tải hàng hóa API", "version": "1.0.0"}
