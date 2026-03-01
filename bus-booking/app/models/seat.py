"""
app/models/seat.py
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class SeatStatus(str, enum.Enum):
    AVAILABLE = "available"
    BOOKED = "booked"
    BLOCKED = "blocked"       # admin-blocked


class SeatDeck(str, enum.Enum):
    LOWER = "lower"
    UPPER = "upper"
    SINGLE = "single"


class Seat(Base):
    __tablename__ = "seats"
    __table_args__ = (
        Index("ix_seats_bus_status", "bus_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bus_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("buses.id", ondelete="CASCADE"), nullable=False
    )
    seat_number: Mapped[str] = mapped_column(String(10), nullable=False)   # e.g. "A1", "L1", "U4"
    deck: Mapped[SeatDeck] = mapped_column(SAEnum(SeatDeck, name="seat_deck_enum"), nullable=False)
    status: Mapped[SeatStatus] = mapped_column(
        SAEnum(SeatStatus, name="seat_status_enum"),
        default=SeatStatus.AVAILABLE,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    bus: Mapped["Bus"] = relationship("Bus", back_populates="seats")
    booking_seats: Mapped[list["BookingSeat"]] = relationship(  # noqa: F821
        "BookingSeat", back_populates="seat"
    )
