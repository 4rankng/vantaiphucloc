from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import decode_access_token
from app.database import get_db
from app.models.base import User

# HTTPBearer extracts the token from the Authorization: Bearer <token> header
_bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Decode the JWT from the Authorization header, load the User from the DB,
    and raise HTTP 401 if the token is invalid/expired or the user is not found.
    """
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise credentials_exception

    user_id: int | None = payload.get("id")
    if user_id is None:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive user")

    return user


def require_roles(*roles: str):
    """
    Factory that returns a FastAPI dependency enforcing role-based access.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_roles("superadmin"))])
        # or as a parameter:
        async def endpoint(user: User = Depends(require_roles("accountant", "superadmin"))):
            ...
    """

    async def _check(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions",
            )
        return current_user

    return _check
