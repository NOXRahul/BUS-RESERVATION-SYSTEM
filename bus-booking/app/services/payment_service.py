"""
app/services/payment_service.py
Razorpay order creation, signature verification, webhook handling.
"""
import hashlib
import hmac
import logging
import uuid

import razorpay
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import NotFoundError, PaymentError
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus
from app.schemas.payment import CreateOrderResponse, VerifyPaymentRequest
from app.workers.email_tasks import send_booking_confirmation

logger = logging.getLogger(__name__)

_razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)


async def create_order(db: AsyncSession, booking_id: uuid.UUID) -> CreateOrderResponse:
    # Fetch booking
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError("Booking not found.")

    if booking.status != BookingStatus.PENDING:
        raise PaymentError("Booking is not in a payable state.")

    # Check if order already exists
    pay_result = await db.execute(select(Payment).where(Payment.booking_id == booking_id))
    existing = pay_result.scalar_one_or_none()
    if existing and existing.status == PaymentStatus.PENDING:
        return CreateOrderResponse(
            razorpay_order_id=existing.razorpay_order_id,
            amount=float(existing.amount),
            currency=existing.currency,
            key_id=settings.RAZORPAY_KEY_ID,
        )

    # Amount in paise
    amount_paise = int(float(booking.total_amount) * 100)

    order = _razorpay_client.order.create({
        "amount": amount_paise,
        "currency": settings.RAZORPAY_CURRENCY,
        "receipt": booking.booking_ref,
        "notes": {
            "booking_id": str(booking.id),
            "user_id": str(booking.user_id),
        },
    })

    payment = Payment(
        booking_id=booking.id,
        razorpay_order_id=order["id"],
        amount=booking.total_amount,
        currency=settings.RAZORPAY_CURRENCY,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    await db.flush()

    return CreateOrderResponse(
        razorpay_order_id=order["id"],
        amount=float(booking.total_amount),
        currency=settings.RAZORPAY_CURRENCY,
        key_id=settings.RAZORPAY_KEY_ID,
    )


async def verify_payment(db: AsyncSession, payload: VerifyPaymentRequest, user_id: uuid.UUID) -> Payment:
    # Signature verification
    expected_sig = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, payload.razorpay_signature):
        raise PaymentError("Payment signature verification failed.")

    # Fetch payment record
    result = await db.execute(
        select(Payment).where(Payment.razorpay_order_id == payload.razorpay_order_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise NotFoundError("Payment record not found.")

    # Update payment
    payment.razorpay_payment_id = payload.razorpay_payment_id
    payment.razorpay_signature = payload.razorpay_signature
    payment.status = PaymentStatus.CAPTURED

    # Update booking
    booking_result = await db.execute(select(Booking).where(Booking.id == payment.booking_id))
    booking = booking_result.scalar_one_or_none()
    if booking:
        booking.status = BookingStatus.CONFIRMED
        # Send confirmation email asynchronously
        user_result = await db.execute(
            select_user := __import__("sqlalchemy", fromlist=["select"]).select(
                __import__("app.models.user", fromlist=["User"]).User
            ).where(__import__("app.models.user", fromlist=["User"]).User.id == user_id)
        )
        send_booking_confirmation.delay(str(booking.id))

    await db.flush()
    logger.info("Payment captured: order=%s payment=%s", payload.razorpay_order_id, payload.razorpay_payment_id)
    return payment


async def handle_webhook(db: AsyncSession, event: str, payload: dict) -> None:
    """
    Process Razorpay webhook events.
    Called only after signature has been verified at the route level.
    """
    if event == "payment.captured":
        payment_entity = payload.get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        payment_id = payment_entity.get("id")

        result = await db.execute(
            select(Payment).where(Payment.razorpay_order_id == order_id)
        )
        payment = result.scalar_one_or_none()
        if payment and payment.status != PaymentStatus.CAPTURED:
            payment.razorpay_payment_id = payment_id
            payment.status = PaymentStatus.CAPTURED

            booking_result = await db.execute(
                select(Booking).where(Booking.id == payment.booking_id)
            )
            booking = booking_result.scalar_one_or_none()
            if booking:
                booking.status = BookingStatus.CONFIRMED
            await db.flush()

    elif event == "payment.failed":
        payment_entity = payload.get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        failure_reason = payment_entity.get("error_description", "Unknown")

        result = await db.execute(
            select(Payment).where(Payment.razorpay_order_id == order_id)
        )
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = PaymentStatus.FAILED
            payment.failure_reason = failure_reason

            booking_result = await db.execute(
                select(Booking).where(Booking.id == payment.booking_id)
            )
            booking = booking_result.scalar_one_or_none()
            if booking:
                booking.status = BookingStatus.FAILED
            await db.flush()
            logger.warning("Payment failed: order=%s reason=%s", order_id, failure_reason)
