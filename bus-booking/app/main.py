"""
app/main.py
FastAPI application factory with all middleware, routers, and lifecycle hooks.
"""
import logging
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.redis import close_redis, get_redis
from app.middleware.exception_handler import (
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.middleware.logging import RequestLoggingMiddleware
from app.core.exceptions import AppException
from app.utils.logging_config import setup_logging

setup_logging()
logger = logging.getLogger("busbooking.main")

# ─── Sentry ───────────────────────────────────────────────────────────────────

if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.2)

# ─── Rate limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting BusBooking API (%s)", settings.APP_ENV)
    await get_redis()          # warm up Redis connection pool
    yield
    await close_redis()
    logger.info("BusBooking API shutdown complete.")


# ─── App factory ──────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title="BusBooking API",
        description="""
## Bus Booking Platform API

Production-grade API for searching and booking bus seats.

### Features
- 🔐 JWT Authentication with refresh tokens
- 🚌 Real-time bus search with caching
- 💺 Redis-backed seat locking (5-min timer)
- 💳 Razorpay payment integration
- 📧 Async email via Celery
- 👑 Admin analytics & management
        """,
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,   # hide in production
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        lifespan=lifespan,
    )

    # ── Rate limiting ──────────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["*"],
    )

    # ── Security headers (custom middleware) ──────────────────────────────────
    app.add_middleware(RequestLoggingMiddleware)

    # ── Exception handlers ────────────────────────────────────────────────────
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"], summary="Health check")
    async def health():
        redis = await get_redis()
        await redis.ping()
        return {
            "status": "healthy",
            "version": "1.0.0",
            "environment": settings.APP_ENV,
        }

    @app.get("/", include_in_schema=False)
    async def root():
        return {"message": "BusBooking API is running. See /docs for documentation."}

    return app


app = create_app()
