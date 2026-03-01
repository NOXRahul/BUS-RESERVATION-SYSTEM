"""
app/core/security.py
JWT creation/verification and bcrypt password utilities.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Password ─────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ─── Tokens ───────────────────────────────────────────────────────────────────

def _create_token(data: Dict[str, Any], expires_delta: timedelta) -> str:
    payload = data.copy()
    payload.update({
        "exp": datetime.now(timezone.utc) + expires_delta,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid4()),          # unique token id – useful for revocation
    })
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str, role: str) -> str:
    return _create_token(
        {"sub": subject, "role": role, "type": "access"},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(
        {"sub": subject, "type": "refresh"},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def create_email_verification_token(email: str) -> str:
    return _create_token(
        {"sub": email, "type": "email_verify"},
        timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS),
    )


def create_password_reset_token(email: str) -> str:
    return _create_token(
        {"sub": email, "type": "password_reset"},
        timedelta(hours=settings.PASSWORD_RESET_EXPIRE_HOURS),
    )


def decode_token(token: str) -> Dict[str, Any]:
    """
    Returns decoded payload or raises JWTError.
    Callers should catch jose.JWTError.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
