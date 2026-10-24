from pydantic_settings import BaseSettings, PydanticBaseSettingsSource


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/vantaihanghoa"
    SECRET_KEY: str = "change-me-to-a-random-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = (
        43200  # 30 days — long-lived for driver mobile devices (Oppo kills background)
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = 365  # 1 year
    DEFAULT_DRIVER_PASSWORD: str = "Phucloc@123"
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://localhost:5174,http://localhost:3000"
    )
    ENVIRONMENT: str = "development"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_POOL_SIZE: int = 10

    # Database pool
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_TIMEOUT: int = 10
    DB_POOL_RECYCLE: int = 600

    # Cache TTLs (seconds)
    CACHE_DEFAULT_TTL: int = 300
    CACHE_PRICING_TTL: int = 600
    CACHE_CLIENTS_TTL: int = 120
    CACHE_ROUTES_TTL: int = 300
    CACHE_DRIVERS_TTL: int = 180
    CACHE_SALARY_TTL: int = 180
    CACHE_LOCATIONS_TTL: int = 300

    # Rate limiting
    RATE_LIMIT_LOGIN_MAX: int = 100
    RATE_LIMIT_LOGIN_WINDOW: int = 300
    RATE_LIMIT_API_MAX: int = 500
    RATE_LIMIT_API_WINDOW: int = 60

    # Photo storage
    PHOTO_STORAGE_ROOT: str = "./data/photos"

    # Worker
    WORKER_TIMEOUT: int = 600
    WORKER_MAX_TRIES: int = 3

    # Deprecated: the Gemini API key has been removed from all environments
    # and every AI path now routes through OpenRouter. Remaining references
    # (legacy OCR analytics, schema inference, reconciliation) are inert
    # without a key and pending migration. Do not use in new code.
    GEMINI_API_KEY: str = ""
    # OpenRouter (OpenAI-compatible) — the sole AI provider. Container OCR
    # additionally requires OPENROUTER_ENABLE; the Excel AI extractor and
    # other direct callers only need the API key.
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_ENABLE: bool = False
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    # Default model for direct OpenRouter callers (Excel AI extraction).
    # Vision-capable; google/gemini-2.5-flash scored 10/10 in the Oct 13 OCR
    # shootout. The OCR chain pins its own models in OPENROUTER_MODELS.
    OPENROUTER_MODEL: str = "google/gemini-2.5-flash"

    # OCR worker limits. Each OpenRouter model carries its own per-call timeout
    # in OPENROUTER_MODELS; OCR_DEADLINE_SECONDS is the wall-clock backstop for
    # one worker attempt. The upload endpoint only stores the image and enqueues
    # an OCR job; the frontend polls the job status endpoint for the result.
    OCR_DEADLINE_SECONDS: float = 70.0
    OCR_UPLOAD_MAX_BYTES: int = 5_242_880
    OCR_IMAGE_MAX_PIXELS: int = 30_000_000
    OCR_OPENROUTER_GLOBAL_CONCURRENCY: int = 3
    OCR_PER_USER_CONCURRENCY: int = 1
    OCR_MAX_RETRIES: int = 3
    OCR_RETRY_INITIAL_DELAY_SECONDS: float = 2.0
    OCR_RETRY_MAX_DELAY_SECONDS: float = 30.0
    OCR_QUEUE_RETRY_DELAY_SECONDS: float = 2.0
    OCR_QUEUE_TIMEOUT_SECONDS: int = 900
    OCR_JOB_TIMEOUT_SECONDS: int = 90
    OCR_CONCURRENCY_SLOT_TTL_SECONDS: int = 180

    # Master switch for the code-only fallback models (OCR_FALLBACK_MODELS
    # at the bottom of this module), retried within the same request when
    # the primary OpenRouter chain (OPENROUTER_MODELS) returns no valid
    # numbers or a failed/transient call.
    OCR_FALLBACK_ENABLE: bool = True

    CHATBOT_ENABLE: int = 0

    # Push notifications (VAPID)
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_CLAIMS_EMAIL: str = ""

    # Observability
    SENTRY_DSN_BACKEND: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    SENTRY_RELEASE: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    def validate_production(self) -> None:
        if self.is_production and self.SECRET_KEY == "change-me-to-a-random-secret-key":
            raise ValueError("SECRET_KEY must be changed from default in production")

    model_config = {"env_file": ".env", "extra": "ignore"}

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ):
        """Prefer .env file over shell env vars.

        Shell env vars like GEMINI_API_KEY can go stale (e.g. rotated keys).
        The .env file is the source of truth for this project.
        """
        return init_settings, dotenv_settings, env_settings, file_secret_settings


settings = Settings()


# Gemini generation models tried in order at every call site (OCR, column
# mapping, schema inference, fallback extraction). Versioned ids such as
# gemini-2.0-flash get retired and 404, so use the -latest aliases. Keep this
# the single source of truth — import from here, don't redefine per module.
GEMINI_MODELS: list[str] = ["gemini-flash-latest", "gemini-flash-lite-latest"]

# OpenRouter OCR models tried in sequence on every request. Each entry is
# (label, model_slug, per_call_timeout_seconds).
# Primary DeepSeek v4.1 Flash 1017 (benchmark 18/10: 6/7 exact, avg 4.0s,
# $0.150/1M — beats deepseek-v4-flash-vision-exp 4/7, 7.2s, $0.216/1M;
# bench 24/10 đọc đúng SEKU5653845 2/2 lần, 1.4-6.7s). Per-call timeout
# phân bổ theo latency đo được → 20s.
# Code-only — not configurable via env / .env.
OPENROUTER_MODELS: list[tuple[str, str, float]] = [
    ("DeepSeek-V4.1-Flash-1017", "deepseek/deepseek-v4.1-flash-1017", 20.0),
]

# Fallback OCR models tried in order AFTER the primary chain
# (OPENROUTER_MODELS) misses (no valid numbers / failed / timed out), before
# salvage. Each entry is either (label, model_slug, per_call_timeout_seconds)
# or just (model_slug, per_call_timeout_seconds) — ocr.py only reads the
# (model_slug, timeout) tail. Rides the same OPENROUTER_API_KEY. Code-only —
# not configurable via env / .env.
# Bench 24/10 (7 ảnh: 5 chuẩn docs/ocr/ + SEKU5653845 của user,
# backend/scripts/compare_ocr.py):
# - DeepSeek-V4.1-Flash-Sep $0.055/1M: 6/7 exact, avg 10.5s — model DUY NHẤT
#   đọc đúng SEKU5653845 (12.5s), loại ảnh SEKU-type mà glm-4.5v thất bại
#   → chen làm FALLBACK ĐẦU.
# - glm-4.5v: 5/7, SAI SEKU (trả [] sau 29.6s) — chỉ giữ slot cuối; timeout
#   hạ 35→20s (bench 17/10: avg 14.4s).
# - qwen3.7-plus: 4/7, avg 21.5s — LOẠI khỏi chuỗi.
# gemini-2.5-flash dropped owner 2026-10-17: zero unique wins in the 7-image
# benchmark (every correct gemini read also covered by DeepSeek or GLM) —
# not worth $0.59/1000 photos as a middle slot.
# Budget: 20 (primary 1017) + 30 (Sep) + 20 (glm-4.5v) = 70s = đúng
# OCR_DEADLINE_SECONDS.
OCR_FALLBACK_MODELS: list[tuple[str, str, float] | tuple[str, float]] = [
    ("DeepSeek-V4.1-Flash-Sep", "deepseek/deepseek-v4.1-flash", 30.0),
    ("z-ai/glm-4.5v", 20.0),
]
