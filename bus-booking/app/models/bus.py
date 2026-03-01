"""
app/models/bus.py
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Enum as SAEnum, ForeignKey, Index,
    Integer, Numeric, String, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class BusType(str, enum.Enum):
    SEATER = "seater"
    SLEEPER = "sleeper"
    SEMI_SLEEPER = "semi_sleeper"


class ACType(str, enum.Enum):
    AC = "ac"
    NON_AC = "non_ac"


class Bus(Base):
    __tablename__ = "buses"
    __table_args__ = (
        Index("ix_buses_route_departure", "route_id", "departure_time"),
        Index("ix_buses_operator", "operator_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bus_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)

    operator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("operators.id", ondelete="RESTRICT"), nullable=False
    )
    route_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("routes.id", ondelete="RESTRICT"), nullable=False
    )

    bus_type: Mapped[BusType] = mapped_column(SAEnum(BusType, name="bus_type_enum"), nullable=False)
    ac_type: Mapped[ACType] = mapped_column(SAEnum(ACType, name="ac_type_enum"), nullable=False)

    total_seats: Mapped[int] = mapped_column(Integer, nullable=False)
    departure_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    arrival_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    price_per_seat: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    amenities: Mapped[str | None] = mapped_column(String(500), nullable=True)  # JSON string

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    operator: Mapped["Operator"] = relationship("Operator", back_populates="buses")
    route: Mapped["Route"] = relationship("Route", back_populates="buses")
    seats: Mapped[list["Seat"]] = relationship("Seat", back_populates="bus", cascade="all, delete-orphan")  # noqa: F821
    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="bus")  # noqa: F821
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="bus")  # noqa: F821
