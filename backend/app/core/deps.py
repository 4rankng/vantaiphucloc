from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from arq import ArqRedis

from app.core.security import decode_access_token
from app.core.worker import get_arq_pool
from app.database import get_db
from app.models.base import User
from app.core.audit_context import set_audit_context

# HTTPBearer extracts the token from the Authorization: Bearer <token> header
# auto_error=False so we can raise 401 (not 403) for missing/invalid tokens
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Decode the JWT from the Authorization header, load the User from the DB,
    and raise HTTP 401 if the token is invalid/expired or the user is not found.
    """
    credentials_exception = HTTPException(
        status_code=401,
        detail="Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

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
        raise HTTPException(status_code=401, detail="Tài khoản đã bị vô hiệu hóa")

    set_audit_context(user.id, request)
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
                detail="Bạn không có quyền thực hiện thao tác này",
            )
        return current_user

    return _check


def require_permission(action: str, resource: str):
    """
    Oso-backed authorization dependency.
    Checks the Polar policy to decide if the current user may perform
    `action` on `resource`.

    Usage:
        async def endpoint(
            user: User = Depends(require_permission("create", "DeliveredTrip")),
        ):
            ...
    """
    from app.core.oso import get_oso

    async def _check(
        current_user: User = Depends(get_current_user),
    ) -> User:
        oso = get_oso()
        if not oso.is_allowed(current_user, action, resource):
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền thực hiện thao tác này",
            )
        return current_user

    return _check


def require_permission_on_resource(action: str, resource_factory):
    """
    Oso-backed authorization with a resource-level check.
    `resource_factory` is an async function(current_user) -> object
    that loads the resource from the DB.

    Usage:
        async def endpoint(
            user: User = Depends(require_permission_on_resource(
                "cancel", lambda wo: wo,  # or a DB lookup
            )),
        ):
            ...
    """
    from app.core.oso import get_oso

    async def _check(
        current_user: User = Depends(get_current_user),
    ) -> User:
        oso = get_oso()
        resource = await resource_factory(current_user)
        if not oso.is_allowed(current_user, action, resource):
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền thực hiện thao tác này",
            )
        return current_user

    return _check


async def get_worker_pool(request: Request) -> ArqRedis:
    """Return the arq pool from app state."""
    return get_arq_pool()
