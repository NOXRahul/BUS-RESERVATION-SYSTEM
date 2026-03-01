"""
app/models/booking.py
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class BookingStatus(str, enum.Enum):
    PENDING = "pending"           # seats locked, payment not done
    CONFIRMED = "confirmed"       # payment successful
    CANCELLED = "cancelled"
    WAITLISTED = "waitlisted"
    FAILED = "failed"             # payment failed


class BookingSeat(Base):
    """Association table – one booking can have multiple seats."""
    __tablename__ = "booking_seats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"))
    seat_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seats.id", ondelete="RESTRICT"))

    booking: Mapped["Booking"] = relationship("Booking", back_populates="booking_seats")
    seat: Mapped["Seat"] = relationship("Seat", back_populates="booking_seats")


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        Index("ix_bookings_user", "user_id"),
        Index("ix_bookings_bus", "bus_id"),
        Index("ix_bookings_status", "status"),
        Index("ix_bookings_booking_ref", "booking_ref"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_ref: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    bus_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("buses.id", ondelete="RESTRICT"))

    status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus, name="booking_status_enum"),
        default=BookingStatus.PENDING,
        nullable=False,
    )

    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)

    passenger_name: Mapped[str] = mapped_column(String(100), nullable=False)
    passenger_age: Mapped[int | None] = mapped_column(nullable=True)
    passenger_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    cancellation_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="bookings")  # noqa: F821
    bus: Mapped["Bus"] = relationship("Bus", back_populates="bookings")     # noqa: F821
    booking_seats: Mapped[list["BookingSeat"]] = relationship(
        "BookingSeat", back_populates="booking", cascade="all, delete-orphan"
    )
    payment: Mapped["Payment | None"] = relationship(  # noqa: F821
        "Payment", back_populates="booking", uselist=False
    )


class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"
    __table_args__ = (Index("ix_waitlist_bus_user", "bus_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bus_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("buses.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    seat_count: Mapped[int] = mapped_column(nullable=False, default=1)
    notified: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
