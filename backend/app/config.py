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

    # AI providers. Each provider is OFF by default — both the *_ENABLE flag
    # AND a non-empty API key must be set for the provider to be used. This
    # forces an explicit opt-in so deployments don't accidentally hit paid
    # APIs on boot. For OCR, the provider order is OpenRouter → Gemini →
    # MiniMax: OpenRouter (Qwen3-VL-8B-Instruct) is tried first when enabled;
    # if it errors (e.g. HTTP 429) the request falls back to Gemini, then
    # MiniMax as last resort. Two Gemini keys are supported so OCR can
    # alternate between them per request (round-robin) and avoid 429 rate
    # limits; if either key 429s the other is tried before falling through
    # further. Enable OPENROUTER_ENABLE + GEMINI_ENABLE together for
    # automatic OpenRouter→Gemini failover, or just one to run a single
    # provider.
    GEMINI_API_KEY: str = ""
    GEMINI_API_KEY2: str = ""
    GEMINI_ENABLE: bool = False
    MINIMAX_API_KEY: str = ""
    MINIMAX_ENABLE: bool = False
    MINIMAX_BASE_URL: str = "https://api.minimax.io/v1"  # OpenAI-compatible host
    MINIMAX_MODEL: str = "MiniMax-M3"
    # OpenRouter (OpenAI-compatible). Opt-in trial provider; off by default.
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_ENABLE: bool = False
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "qwen/qwen3-vl-8b-instruct"
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
