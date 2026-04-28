from pydantic import BaseModel, field_validator
from datetime import datetime


# ── Input sanitization ──────────────────────────────────────────────

def _sanitize_identifier(value: str) -> str:
    return value.strip()[:255]


# Auth
class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def sanitize_username(cls, v: str) -> str:
        return _sanitize_identifier(v)

    @field_validator("password")
    @classmethod
    def sanitize_password(cls, v: str) -> str:
        return v[:1024]


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class UserOut(BaseModel):
    id: int
    phone: str
    email: str | None = None
    username: str
    role: str
    company_id: int | None
    is_active: bool
    created_at: datetime | None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class MessageResponse(BaseModel):
    message: str


# User CRUD
class UserCreate(BaseModel):
    phone: str
    email: str | None = None
    username: str
    password: str
    role: str = "driver"
    company_id: int | None = None


class UserUpdate(BaseModel):
    phone: str | None = None
    email: str | None = None
    username: str | None = None
    role: str | None = None
    company_id: int | None = None
    is_active: bool | None = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str
