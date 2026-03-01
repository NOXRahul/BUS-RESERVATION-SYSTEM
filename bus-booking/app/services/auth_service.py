"""
app/services/auth_service.py
Business logic for authentication.
"""
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AuthenticationError, ConflictError, NotFoundError, ValidationError,
)
from app.core.security import (
    create_access_token, create_email_verification_token,
    create_password_reset_token, create_refresh_token,
    decode_token, hash_password, verify_password,
)
from app.models.user import RefreshToken, Role, RoleEnum, User
from app.schemas.auth import (
    LoginRequest, PasswordResetConfirm, RegisterRequest,
    TokenResponse, UserResponse,
)
from app.workers.email_tasks import send_verification_email, send_password_reset_email
from app.core.config import settings

logger = logging.getLogger(__name__)


async def _get_default_role(db: AsyncSession) -> Role:
    result = await db.execute(select(Role).where(Role.name == RoleEnum.USER))
    role = result.scalar_one_or_none()
    if not role:
        role = Role(name=RoleEnum.USER, description="Default user role")
        db.add(role)
        await db.flush()
    return role


async def register_user(db: AsyncSession, payload: RegisterRequest) -> UserResponse:
    # Check duplicate email
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise ConflictError("A user with this email already exists.")

    role = await _get_default_role(db)

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        phone=payload.phone,
        role_id=role.id,
    )
    db.add(user)
    await db.flush()

    # Send verification email async via Celery
    token = create_email_verification_token(payload.email)
    send_verification_email.delay(payload.email, payload.name, token)

    logger.info("User registered: %s", payload.email)
    return UserResponse.model_validate(user)


async def verify_email(db: AsyncSession, token: str) -> None:
    try:
        payload = decode_token(token)
    except JWTError:
        raise ValidationError("Invalid or expired verification token.")

    if payload.get("type") != "email_verify":
        raise ValidationError("Invalid token type.")

    email: str = payload["sub"]
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found.")

    user.is_verified = True
    await db.flush()


async def login(db: AsyncSession, payload: LoginRequest) -> TokenResponse:
    result = await db.execute(
        select(User).where(User.email == payload.email, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise AuthenticationError("Invalid email or password.")

    if not user.is_active:
        raise AuthenticationError("Account is disabled. Contact support.")

    if not user.is_verified:
        raise AuthenticationError("Please verify your email before logging in.")

    # Fetch role name
    await db.refresh(user, ["role"])
    role_name = user.role.name if user.role else RoleEnum.USER

    access = create_access_token(str(user.id), role_name)
    refresh = create_refresh_token(str(user.id))

    # Persist refresh token
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    rt = RefreshToken(user_id=user.id, token=refresh, expires_at=expires_at)
    db.add(rt)
    await db.flush()

    logger.info("User logged in: %s", user.email)
    return TokenResponse(access_token=access, refresh_token=refresh)


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> TokenResponse:
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise AuthenticationError("Invalid refresh token.")

    if payload.get("type") != "refresh":
        raise AuthenticationError("Invalid token type.")

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == refresh_token,
            RefreshToken.revoked.is_(False),
        )
    )
    rt = result.scalar_one_or_none()
    if not rt or rt.expires_at < datetime.now(timezone.utc):
        raise AuthenticationError("Refresh token expired or revoked.")

    # Rotate – revoke old, issue new
    rt.revoked = True

    user_result = await db.execute(select(User).where(User.id == rt.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise AuthenticationError("User not found.")

    await db.refresh(user, ["role"])
    role_name = user.role.name if user.role else RoleEnum.USER

    new_access = create_access_token(str(user.id), role_name)
    new_refresh = create_refresh_token(str(user.id))

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_rt = RefreshToken(user_id=user.id, token=new_refresh, expires_at=expires_at)
    db.add(new_rt)
    await db.flush()

    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


async def request_password_reset(db: AsyncSession, email: str) -> None:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    # Always succeed silently to prevent user enumeration
    if user:
        token = create_password_reset_token(email)
        send_password_reset_email.delay(email, user.name, token)


async def confirm_password_reset(db: AsyncSession, payload: PasswordResetConfirm) -> None:
    try:
        data = decode_token(payload.token)
    except JWTError:
        raise ValidationError("Invalid or expired reset token.")

    if data.get("type") != "password_reset":
        raise ValidationError("Invalid token type.")

    result = await db.execute(select(User).where(User.email == data["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found.")

    user.hashed_password = hash_password(payload.new_password)
    await db.flush()
    logger.info("Password reset for: %s", user.email)
