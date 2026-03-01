"""
app/api/deps.py
FastAPI dependencies for auth, DB session, role checks.
"""
import uuid
from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import RoleEnum, User

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise AuthenticationError("Invalid or expired access token.")

    if payload.get("type") != "access":
        raise AuthenticationError("Invalid token type.")

    user_id = payload.get("sub")
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id), User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise AuthenticationError("User not found or inactive.")

    return user


async def get_current_verified_user(
    user: Annotated[User, Depends(get_current_user)]
) -> User:
    if not user.is_verified:
        raise AuthorizationError("Email not verified.")
    return user


async def require_admin(
    user: Annotated[User, Depends(get_current_verified_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    await db.refresh(user, ["role"])
    if user.role.name != RoleEnum.ADMIN:
        raise AuthorizationError("Admin access required.")
    return user


# Type aliases for cleaner route signatures
CurrentUser = Annotated[User, Depends(get_current_verified_user)]
AdminUser = Annotated[User, Depends(require_admin)]
DBSession = Annotated[AsyncSession, Depends(get_db)]
