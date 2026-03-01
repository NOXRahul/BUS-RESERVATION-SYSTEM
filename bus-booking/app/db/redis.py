"""
app/db/redis.py
Async Redis client, seat-lock helpers, and cache utilities.
"""
import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
        )
    return _redis_pool


async def close_redis():
    global _redis_pool
    if _redis_pool:
        await _redis_pool.aclose()
        _redis_pool = None


# ─── Seat locking ─────────────────────────────────────────────────────────────

def _seat_lock_key(seat_id: str) -> str:
    return f"seat_lock:{seat_id}"


async def acquire_seat_lock(seat_id: str, user_id: str, ttl: int = settings.SEAT_LOCK_TTL) -> bool:
    """
    Attempt to acquire a distributed lock for `seat_id`.
    Returns True if lock acquired, False if already locked.

    Uses SET NX EX (atomic) to prevent race conditions.
    """
    redis = await get_redis()
    key = _seat_lock_key(seat_id)
    result = await redis.set(key, user_id, nx=True, ex=ttl)
    if result:
        logger.debug("Seat lock acquired: seat=%s user=%s ttl=%ds", seat_id, user_id, ttl)
    return bool(result)


async def release_seat_lock(seat_id: str, user_id: str) -> bool:
    """
    Release lock only if owned by this user (Lua script for atomicity).
    Returns True if released, False if lock belonged to someone else.
    """
    redis = await get_redis()
    key = _seat_lock_key(seat_id)
    lua_script = """
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
        else
            return 0
        end
    """
    result = await redis.eval(lua_script, 1, key, user_id)  # type: ignore[arg-type]
    return bool(result)


async def get_seat_lock_owner(seat_id: str) -> Optional[str]:
    redis = await get_redis()
    return await redis.get(_seat_lock_key(seat_id))


async def extend_seat_lock(seat_id: str, user_id: str, ttl: int = settings.SEAT_LOCK_TTL) -> bool:
    """Extend TTL if the user still owns the lock."""
    redis = await get_redis()
    key = _seat_lock_key(seat_id)
    lua_script = """
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("EXPIRE", KEYS[1], ARGV[2])
        else
            return 0
        end
    """
    result = await redis.eval(lua_script, 1, key, user_id, str(ttl))  # type: ignore[arg-type]
    return bool(result)


# ─── Generic cache ────────────────────────────────────────────────────────────

async def cache_set(key: str, value: Any, ttl: int = settings.REDIS_CACHE_TTL) -> None:
    redis = await get_redis()
    await redis.set(key, json.dumps(value), ex=ttl)


async def cache_get(key: str) -> Optional[Any]:
    redis = await get_redis()
    raw = await redis.get(key)
    if raw is None:
        return None
    return json.loads(raw)


async def cache_delete(key: str) -> None:
    redis = await get_redis()
    await redis.delete(key)


async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a glob pattern. Use sparingly in production."""
    redis = await get_redis()
    keys = await redis.keys(pattern)
    if keys:
        return await redis.delete(*keys)
    return 0
