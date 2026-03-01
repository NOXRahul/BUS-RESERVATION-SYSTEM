"""
app/services/bus_service.py
Bus search with caching, CRUD for admin.
"""
import hashlib
import json
import logging
import uuid
from datetime import date
from typing import Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictError, NotFoundError
from app.db.redis import cache_delete_pattern, cache_get, cache_set
from app.models.bus import ACType, Bus, BusType
from app.models.seat import Seat, SeatStatus
from app.schemas.bus import BusCreate, BusResponse, BusSearchParams, BusUpdate, PaginatedBusResponse

logger = logging.getLogger(__name__)


def _search_cache_key(params: BusSearchParams) -> str:
    raw = json.dumps(params.model_dump(), default=str, sort_keys=True)
    return f"bus_search:{hashlib.md5(raw.encode()).hexdigest()}"


async def search_buses(db: AsyncSession, params: BusSearchParams) -> PaginatedBusResponse:
    cache_key = _search_cache_key(params)
    cached = await cache_get(cache_key)
    if cached:
        logger.debug("Cache hit: %s", cache_key)
        return PaginatedBusResponse(**cached)

    # Build query
    filters = [
        Bus.is_active.is_(True),
        Bus.deleted_at.is_(None),
    ]

    # Join route for source/dest
    from app.models.route import Route
    filters.extend([
        Route.source_city.ilike(f"%{params.source}%"),
        Route.destination_city.ilike(f"%{params.destination}%"),
    ])

    if params.date:
        travel_date = date.fromisoformat(params.date)
        filters.append(func.date(Bus.departure_time) == travel_date)

    if params.bus_type:
        filters.append(Bus.bus_type == params.bus_type)
    if params.ac_type:
        filters.append(Bus.ac_type == params.ac_type)
    if params.min_price is not None:
        filters.append(Bus.price_per_seat >= params.min_price)
    if params.max_price is not None:
        filters.append(Bus.price_per_seat <= params.max_price)
    if params.operator_id:
        filters.append(Bus.operator_id == params.operator_id)

    base_query = (
        select(Bus)
        .join(Route)
        .where(and_(*filters))
        .options(selectinload(Bus.operator), selectinload(Bus.route))
    )

    # Count
    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar_one()

    # Paginate
    offset = (params.page - 1) * params.page_size
    result = await db.execute(
        base_query.order_by(Bus.departure_time).offset(offset).limit(params.page_size)
    )
    buses = result.scalars().all()

    # For each bus compute available seats
    items = []
    for bus in buses:
        booked_count_result = await db.execute(
            select(func.count(Seat.id)).where(
                Seat.bus_id == bus.id,
                Seat.status == SeatStatus.BOOKED,
            )
        )
        booked = booked_count_result.scalar_one()
        bus_dict = {
            **BusResponse.model_validate(bus).model_dump(),
            "available_seats": bus.total_seats - booked,
        }
        items.append(bus_dict)

    response = PaginatedBusResponse(total=total, page=params.page, page_size=params.page_size, items=items)
    await cache_set(cache_key, response.model_dump(mode="json"))
    return response


async def get_bus(db: AsyncSession, bus_id: uuid.UUID) -> Bus:
    result = await db.execute(
        select(Bus)
        .where(Bus.id == bus_id, Bus.deleted_at.is_(None))
        .options(selectinload(Bus.operator), selectinload(Bus.route), selectinload(Bus.seats))
    )
    bus = result.scalar_one_or_none()
    if not bus:
        raise NotFoundError("Bus not found.")
    return bus


async def create_bus(db: AsyncSession, payload: BusCreate) -> Bus:
    result = await db.execute(select(Bus).where(Bus.bus_number == payload.bus_number))
    if result.scalar_one_or_none():
        raise ConflictError("Bus number already registered.")

    bus = Bus(**payload.model_dump())
    db.add(bus)
    await db.flush()

    # Auto-create seats
    for i in range(1, payload.total_seats + 1):
        seat = Seat(
            bus_id=bus.id,
            seat_number=str(i),
            deck="lower" if i <= payload.total_seats // 2 else "upper",
        )
        db.add(seat)

    await db.flush()
    await cache_delete_pattern("bus_search:*")
    return bus


async def update_bus(db: AsyncSession, bus_id: uuid.UUID, payload: BusUpdate) -> Bus:
    bus = await get_bus(db, bus_id)
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(bus, k, v)
    await db.flush()
    await cache_delete_pattern("bus_search:*")
    return bus


async def delete_bus(db: AsyncSession, bus_id: uuid.UUID) -> None:
    bus = await get_bus(db, bus_id)
    from datetime import datetime, timezone
    bus.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await cache_delete_pattern("bus_search:*")
