"""
app/api/v1/endpoints/buses.py
"""
import uuid

from fastapi import APIRouter, Depends, Query, status
from typing import Optional

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.models.bus import ACType, BusType
from app.schemas.bus import BusCreate, BusResponse, BusSearchParams, BusUpdate, PaginatedBusResponse
from app.services import bus_service
from app.schemas.booking import SeatResponse
from sqlalchemy import select
from app.models.seat import Seat

router = APIRouter(prefix="/buses", tags=["Buses"])


@router.get("/search", response_model=PaginatedBusResponse)
async def search_buses(
    source: str = Query(..., min_length=2),
    destination: str = Query(..., min_length=2),
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    bus_type: Optional[BusType] = None,
    ac_type: Optional[ACType] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    operator_id: Optional[uuid.UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: DBSession = Depends(),
):
    """Search available buses by source, destination, and date with optional filters."""
    params = BusSearchParams(
        source=source, destination=destination, date=date,
        bus_type=bus_type, ac_type=ac_type,
        min_price=min_price, max_price=max_price,
        operator_id=operator_id, page=page, page_size=page_size,
    )
    return await bus_service.search_buses(db, params)


@router.get("/{bus_id}", response_model=BusResponse)
async def get_bus(bus_id: uuid.UUID, db: DBSession):
    """Get bus details by ID."""
    bus = await bus_service.get_bus(db, bus_id)
    from app.models.seat import SeatStatus
    from sqlalchemy import func
    booked_count_result = await db.execute(
        select(func.count(Seat.id)).where(Seat.bus_id == bus.id, Seat.status == SeatStatus.BOOKED)
    )
    booked = booked_count_result.scalar_one()
    data = BusResponse.model_validate(bus).model_dump()
    data["available_seats"] = bus.total_seats - booked
    return data


@router.get("/{bus_id}/seats", response_model=list[SeatResponse])
async def get_bus_seats(bus_id: uuid.UUID, db: DBSession):
    """Get all seats for a bus with their current status."""
    result = await db.execute(select(Seat).where(Seat.bus_id == bus_id))
    seats = result.scalars().all()
    return [SeatResponse.model_validate(s) for s in seats]


# ─── Admin endpoints ──────────────────────────────────────────────────────────

@router.post("", response_model=BusResponse, status_code=status.HTTP_201_CREATED)
async def create_bus(payload: BusCreate, db: DBSession, _admin: AdminUser):
    """[Admin] Add a new bus."""
    bus = await bus_service.create_bus(db, payload)
    return BusResponse.model_validate(bus)


@router.patch("/{bus_id}", response_model=BusResponse)
async def update_bus(bus_id: uuid.UUID, payload: BusUpdate, db: DBSession, _admin: AdminUser):
    """[Admin] Update bus details."""
    bus = await bus_service.update_bus(db, bus_id, payload)
    return BusResponse.model_validate(bus)


@router.delete("/{bus_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bus(bus_id: uuid.UUID, db: DBSession, _admin: AdminUser):
    """[Admin] Soft-delete a bus."""
    await bus_service.delete_bus(db, bus_id)
