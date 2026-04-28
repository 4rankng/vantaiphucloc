from pydantic import BaseModel
from datetime import datetime


# Auth
class LoginRequest(BaseModel):
    phone: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int


class UserOut(BaseModel):
    id: int
    phone: str
    username: str          # display name / full name
    role: str
    company_id: int | None
    is_active: bool
    created_at: datetime | None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user: UserOut
    access_token: str
    token_type: str = "Bearer"
    expires_in: int


# User CRUD
class UserCreate(BaseModel):
    phone: str
    username: str          # display name / full name
    password: str
    role: str = "driver"   # superadmin | director | accountant | driver
    company_id: int | None = None


class UserUpdate(BaseModel):
    phone: str | None = None
    username: str | None = None
    role: str | None = None
    company_id: int | None = None
    is_active: bool | None = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str
