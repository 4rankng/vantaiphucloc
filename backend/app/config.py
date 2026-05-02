from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/vantaihanghoa"
    SECRET_KEY: str = "change-me-to-a-random-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    ENVIRONMENT: str = "development"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_POOL_SIZE: int = 10

    # Cache TTLs (seconds)
    CACHE_DEFAULT_TTL: int = 300
    CACHE_PRICING_TTL: int = 600
    CACHE_CLIENTS_TTL: int = 120
    CACHE_ROUTES_TTL: int = 300
    CACHE_DRIVERS_TTL: int = 180
    CACHE_SALARY_TTL: int = 180

    # Rate limiting
    RATE_LIMIT_LOGIN_MAX: int = 5
    RATE_LIMIT_LOGIN_WINDOW: int = 300
    RATE_LIMIT_API_MAX: int = 100
    RATE_LIMIT_API_WINDOW: int = 60

    # Photo storage
    PHOTO_STORAGE_ROOT: str = "./data/photos"

    # Worker
    WORKER_TIMEOUT: int = 600
    WORKER_MAX_TRIES: int = 3

    # AI provider
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Push notifications (VAPID)
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_CLAIMS_EMAIL: str = ""

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


settings = Settings()
