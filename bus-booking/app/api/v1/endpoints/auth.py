"""
app/api/v1/endpoints/auth.py
"""
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, DBSession
from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest, PasswordResetConfirm, PasswordResetRequest,
    RefreshRequest, RegisterRequest, TokenResponse, UserResponse,
    VerifyEmailRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: DBSession):
    """Register a new user. Sends verification email."""
    return await auth_service.register_user(db, payload)


@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(payload: VerifyEmailRequest, db: DBSession):
    """Verify email address using the token sent via email."""
    await auth_service.verify_email(db, payload.token)
    return {"message": "Email verified successfully."}


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: DBSession):
    """Login and receive JWT access + refresh tokens."""
    return await auth_service.login(db, payload)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: DBSession):
    """Rotate refresh token and issue a new access token."""
    return await auth_service.refresh_access_token(db, payload.refresh_token)


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
async def request_reset(payload: PasswordResetRequest, db: DBSession):
    """Request a password reset email. Always returns 202 to prevent enumeration."""
    await auth_service.request_password_reset(db, payload.email)
    return {"message": "If the email exists, a reset link has been sent."}


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
async def confirm_reset(payload: PasswordResetConfirm, db: DBSession):
    """Set a new password using the reset token."""
    await auth_service.confirm_password_reset(db, payload)
    return {"message": "Password updated successfully."}


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser):
    """Return current authenticated user info."""
    return current_user
