"""
app/api/v1/endpoints/bookings.py
"""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CurrentUser, DBSession
from app.schemas.booking import (
    BookingCancelRequest, BookingCreate, BookingResponse,
    SeatLockRequest, SeatLockResponse, WaitlistCreate,
)
from app.services import booking_service
from app.models.booking import WaitlistEntry

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post("/seats/lock", response_model=SeatLockResponse)
async def lock_seats(payload: SeatLockRequest, current_user: CurrentUser):
    """
    Lock seats for 5 minutes before payment.
    Must be called before creating a booking.
    """
    return await booking_service.lock_seats(payload.seat_ids, str(current_user.id))


@router.post("/seats/unlock", status_code=status.HTTP_200_OK)
async def unlock_seats(payload: SeatLockRequest, current_user: CurrentUser):
    """Release seat locks (e.g., user navigated away)."""
    await booking_service.unlock_seats(payload.seat_ids, str(current_user.id))
    return {"message": "Seats unlocked."}


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreate, db: DBSession, current_user: CurrentUser
):
    """
    Create a booking. Seats must be locked first via /seats/lock.
    Returns PENDING booking; complete payment via /payments/orders.
    """
    return await booking_service.create_booking(db, payload, current_user.id, current_user.email)


@router.get("", response_model=list[BookingResponse])
async def list_bookings(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Get current user's booking history."""
    return await booking_service.get_user_bookings(db, current_user.id, page, page_size)


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: uuid.UUID, db: DBSession, current_user: CurrentUser):
    """Get a specific booking belonging to the current user."""
    booking = await booking_service.get_booking(db, booking_id, current_user.id)
    return BookingResponse.model_validate(booking)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: uuid.UUID,
    payload: BookingCancelRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """Cancel a booking. Triggers waitlist notification if applicable."""
    return await booking_service.cancel_booking(db, booking_id, current_user.id, payload.reason)


@router.post("/waitlist", status_code=status.HTTP_201_CREATED)
async def join_waitlist(
    payload: WaitlistCreate, db: DBSession, current_user: CurrentUser
):
    """Join the waitlist for a fully-booked bus."""
    entry = await booking_service.add_to_waitlist(db, payload, current_user.id)
    return {"message": "Added to waitlist.", "entry_id": str(entry.id)}
