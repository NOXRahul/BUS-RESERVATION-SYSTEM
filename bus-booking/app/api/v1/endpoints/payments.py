"""
app/api/v1/endpoints/payments.py
"""
import hashlib
import hmac
import json
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.api.deps import CurrentUser, DBSession
from app.core.config import settings
from app.core.exceptions import PaymentError
from app.schemas.payment import CreateOrderRequest, CreateOrderResponse, PaymentResponse, VerifyPaymentRequest
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/orders", response_model=CreateOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(payload: CreateOrderRequest, db: DBSession, current_user: CurrentUser):
    """Create a Razorpay order for a pending booking."""
    return await payment_service.create_order(db, payload.booking_id)


@router.post("/verify", response_model=PaymentResponse)
async def verify_payment(payload: VerifyPaymentRequest, db: DBSession, current_user: CurrentUser):
    """
    Verify Razorpay payment signature after successful payment on frontend.
    Updates booking status to CONFIRMED on success.
    """
    return await payment_service.verify_payment(db, payload, current_user.id)


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def razorpay_webhook(request: Request, db: DBSession):
    """
    Razorpay webhook endpoint.
    Razorpay-Signature header is verified before processing.
    """
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # Verify webhook signature
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    event_data = json.loads(body)
    event = event_data.get("event", "")

    await payment_service.handle_webhook(db, event, event_data.get("payload", {}))
    return {"status": "ok"}
