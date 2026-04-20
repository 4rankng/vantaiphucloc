from pydantic import BaseModel, EmailStr
from datetime import datetime


# Auth
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int


class UserOut(BaseModel):
    id: int
    username: str
    email: str | None
    fullname: str | None
    role: str
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
    username: str
    email: EmailStr | None = None
    fullname: str | None = None
    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    fullname: str | None = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str
