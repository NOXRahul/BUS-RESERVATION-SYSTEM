"""
app/schemas/payment.py
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.payment import PaymentStatus


class CreateOrderRequest(BaseModel):
    booking_id: uuid.UUID


class CreateOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: float
    currency: str
    key_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    booking_id: uuid.UUID
    razorpay_order_id: str
    razorpay_payment_id: Optional[str]
    amount: float
    currency: str
    status: PaymentStatus
    created_at: datetime


class WebhookPayload(BaseModel):
    """Razorpay webhook – we validate signature separately before parsing."""
    event: str
    payload: dict
