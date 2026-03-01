"""
app/services/booking_service.py
Seat locking, booking creation, cancellation, waitlist.
"""
import logging
import random
import string
import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import BookingError, NotFoundError, SeatLockError
from app.db.redis import acquire_seat_lock, release_seat_lock
from app.models.booking import Booking, BookingStatus, BookingSeat, WaitlistEntry
from app.models.seat import Seat, SeatStatus
from app.schemas.booking import (
    BookingCreate, BookingResponse,
    SeatLockRequest, SeatLockResponse, WaitlistCreate,
)
from app.workers.email_tasks import send_booking_confirmation

logger = logging.getLogger(__name__)


def _generate_booking_ref() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"BB{suffix}"


# ─── Seat locking ─────────────────────────────────────────────────────────────

async def lock_seats(
    seat_ids: list[uuid.UUID], user_id: str
) -> SeatLockResponse:
    locked, failed = [], []
    for seat_id in seat_ids:
        acquired = await acquire_seat_lock(str(seat_id), user_id)
        if acquired:
            locked.append(seat_id)
        else:
            failed.append(seat_id)

    # If any seat failed, release the ones we already locked
    if failed:
        for sid in locked:
            await release_seat_lock(str(sid), user_id)
        locked.clear()
        raise SeatLockError(
            "Could not lock all requested seats.",
            details={"failed_seats": [str(s) for s in failed]},
        )

    return SeatLockResponse(
        locked=locked,
        failed=failed,
        lock_expires_in_seconds=settings.SEAT_LOCK_TTL,
    )


async def unlock_seats(seat_ids: list[uuid.UUID], user_id: str) -> None:
    for seat_id in seat_ids:
        await release_seat_lock(str(seat_id), user_id)


# ─── Booking ──────────────────────────────────────────────────────────────────

async def create_booking(
    db: AsyncSession, payload: BookingCreate, user_id: uuid.UUID, user_email: str
) -> BookingResponse:
    # Verify seats exist and belong to bus
    result = await db.execute(
        select(Seat).where(
            and_(
                Seat.id.in_(payload.seat_ids),
                Seat.bus_id == payload.bus_id,
                Seat.status == SeatStatus.AVAILABLE,
            )
        )
    )
    seats = result.scalars().all()

    if len(seats) != len(payload.seat_ids):
        raise BookingError("One or more seats are unavailable or don't belong to this bus.")

    # Verify Redis locks are held by this user
    from app.db.redis import get_seat_lock_owner
    for seat in seats:
        owner = await get_seat_lock_owner(str(seat.id))
        if owner != str(user_id):
            raise SeatLockError(f"Seat {seat.seat_number} is not locked by you.")

    # Fetch bus for pricing
    from app.models.bus import Bus
    bus_result = await db.execute(select(Bus).where(Bus.id == payload.bus_id))
    bus = bus_result.scalar_one_or_none()
    if not bus:
        raise NotFoundError("Bus not found.")

    total_amount = float(bus.price_per_seat) * len(seats)
    booking_ref = _generate_booking_ref()

    booking = Booking(
        booking_ref=booking_ref,
        user_id=user_id,
        bus_id=payload.bus_id,
        status=BookingStatus.PENDING,
        total_amount=total_amount,
        passenger_name=payload.passenger_name,
        passenger_age=payload.passenger_age,
        passenger_phone=payload.passenger_phone,
    )
    db.add(booking)
    await db.flush()

    for seat in seats:
        db.add(BookingSeat(booking_id=booking.id, seat_id=seat.id))
        seat.status = SeatStatus.BOOKED

    await db.flush()

    # Release Redis locks since seats are now DB-booked
    await unlock_seats(payload.seat_ids, str(user_id))

    logger.info("Booking created: %s user=%s", booking_ref, user_id)
    return BookingResponse.model_validate(booking)


async def get_user_bookings(
    db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20
) -> list[BookingResponse]:
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Booking)
        .where(Booking.user_id == user_id, Booking.deleted_at.is_(None))
        .order_by(Booking.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return [BookingResponse.model_validate(b) for b in result.scalars().all()]


async def get_booking(db: AsyncSession, booking_id: uuid.UUID, user_id: uuid.UUID) -> Booking:
    result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.user_id == user_id,
            Booking.deleted_at.is_(None),
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError("Booking not found.")
    return booking


async def cancel_booking(
    db: AsyncSession,
    booking_id: uuid.UUID,
    user_id: uuid.UUID,
    reason: str | None,
) -> BookingResponse:
    booking = await get_booking(db, booking_id, user_id)

    if booking.status == BookingStatus.CANCELLED:
        raise BookingError("Booking is already cancelled.")

    if booking.status == BookingStatus.PENDING:
        # Release seat locks if still in pending
        bs_result = await db.execute(
            select(BookingSeat).where(BookingSeat.booking_id == booking.id)
        )
        for bs in bs_result.scalars().all():
            await release_seat_lock(str(bs.seat_id), str(user_id))
            # Free the seat
            seat_result = await db.execute(select(Seat).where(Seat.id == bs.seat_id))
            seat = seat_result.scalar_one_or_none()
            if seat:
                seat.status = SeatStatus.AVAILABLE

    booking.status = BookingStatus.CANCELLED
    booking.cancellation_reason = reason
    booking.cancelled_at = datetime.now(timezone.utc)
    await db.flush()

    # Trigger waitlist check
    from app.workers.booking_tasks import process_waitlist
    process_waitlist.delay(str(booking.bus_id))

    logger.info("Booking cancelled: %s", booking.booking_ref)
    return BookingResponse.model_validate(booking)


# ─── Waitlist ─────────────────────────────────────────────────────────────────

async def add_to_waitlist(
    db: AsyncSession, payload: WaitlistCreate, user_id: uuid.UUID
) -> WaitlistEntry:
    entry = WaitlistEntry(
        bus_id=payload.bus_id,
        user_id=user_id,
        seat_count=payload.seat_count,
    )
    db.add(entry)
    await db.flush()
    return entry
