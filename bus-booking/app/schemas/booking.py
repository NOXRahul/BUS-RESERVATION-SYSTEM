"""
app/schemas/booking.py
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.booking import BookingStatus
from app.models.seat import SeatDeck, SeatStatus


class SeatResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    seat_number: str
    deck: SeatDeck
    status: SeatStatus


class SeatLockRequest(BaseModel):
    seat_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=10)


class SeatLockResponse(BaseModel):
    locked: list[uuid.UUID]
    failed: list[uuid.UUID]
    lock_expires_in_seconds: int


class BookingCreate(BaseModel):
    bus_id: uuid.UUID
    seat_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=10)
    passenger_name: str = Field(..., min_length=2, max_length=100)
    passenger_age: Optional[int] = Field(None, ge=1, le=120)
    passenger_phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{9,14}$")


class BookingResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    booking_ref: str
    bus_id: uuid.UUID
    status: BookingStatus
    total_amount: float
    discount_amount: float
    passenger_name: str
    passenger_phone: Optional[str]
    created_at: datetime


class BookingCancelRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class WaitlistCreate(BaseModel):
    bus_id: uuid.UUID
    seat_count: int = Field(1, ge=1, le=10)
