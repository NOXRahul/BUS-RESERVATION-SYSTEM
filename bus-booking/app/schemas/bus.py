"""
app/schemas/bus.py
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.bus import ACType, BusType


class BusSearchParams(BaseModel):
    source: str = Field(..., min_length=2, max_length=100)
    destination: str = Field(..., min_length=2, max_length=100)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    bus_type: Optional[BusType] = None
    ac_type: Optional[ACType] = None
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    operator_id: Optional[uuid.UUID] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class OperatorResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    name: str
    contact_email: str


class RouteResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    source_city: str
    destination_city: str
    distance_km: int
    estimated_duration_minutes: int
    base_price: float


class BusResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    bus_number: str
    name: str
    bus_type: BusType
    ac_type: ACType
    total_seats: int
    available_seats: int
    departure_time: datetime
    arrival_time: datetime
    price_per_seat: float
    amenities: Optional[str]
    operator: OperatorResponse
    route: RouteResponse


class BusCreate(BaseModel):
    bus_number: str = Field(..., min_length=3, max_length=30)
    name: str = Field(..., min_length=2, max_length=150)
    operator_id: uuid.UUID
    route_id: uuid.UUID
    bus_type: BusType
    ac_type: ACType
    total_seats: int = Field(..., ge=1, le=100)
    departure_time: datetime
    arrival_time: datetime
    price_per_seat: float = Field(..., gt=0)
    amenities: Optional[str] = None

    @field_validator("arrival_time")
    @classmethod
    def arrival_after_departure(cls, v, info):
        if "departure_time" in info.data and v <= info.data["departure_time"]:
            raise ValueError("arrival_time must be after departure_time")
        return v


class BusUpdate(BaseModel):
    name: Optional[str] = None
    bus_type: Optional[BusType] = None
    ac_type: Optional[ACType] = None
    price_per_seat: Optional[float] = Field(None, gt=0)
    is_active: Optional[bool] = None
    amenities: Optional[str] = None


class PaginatedBusResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[BusResponse]
