from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

from app.config import settings
from app.api.v1.router import router as api_v1_router
from app.core.redis import init_redis, close_redis
from app.core.worker import init_arq_pool, close_arq_pool

MAX_REQUEST_BODY_BYTES = 1_048_576  # 1 MB


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH"):
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
                return StarletteResponse(
                    status_code=413,
                    content="Request body too large",
                )
        return await call_next(request)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.validate_production()
    await init_redis()
    await init_arq_pool()
    yield
    await close_arq_pool()
    await close_redis()


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


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/")
async def root():
    return {"message": "Vận tải hàng hóa API", "version": "1.0.0"}
