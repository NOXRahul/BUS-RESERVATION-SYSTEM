"""
app/workers/email_tasks.py
Async email sending via Celery + SMTP.
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _send_smtp(to: str, subject: str, html_body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAILS_FROM_EMAIL, to, msg.as_string())


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email(self, email: str, name: str, token: str):
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = f"""
    <h2>Hi {name},</h2>
    <p>Thanks for registering on BusBooking! Please verify your email:</p>
    <a href="{link}" style="padding:10px 20px;background:#3b82f6;color:white;border-radius:5px;text-decoration:none;">
        Verify Email
    </a>
    <p>This link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.</p>
    """
    try:
        _send_smtp(email, "Verify your BusBooking account", html)
        logger.info("Verification email sent to %s", email)
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", email, exc)
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email(self, email: str, name: str, token: str):
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <h2>Hi {name},</h2>
    <p>You requested a password reset for your BusBooking account:</p>
    <a href="{link}" style="padding:10px 20px;background:#ef4444;color:white;border-radius:5px;text-decoration:none;">
        Reset Password
    </a>
    <p>This link expires in {settings.PASSWORD_RESET_EXPIRE_HOURS} hours. If you didn't request this, ignore this email.</p>
    """
    try:
        _send_smtp(email, "Reset your BusBooking password", html)
        logger.info("Password reset email sent to %s", email)
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def send_booking_confirmation(self, booking_id: str):
    """
    Fetch booking details from DB and send confirmation email.
    Runs in Celery worker – uses sync SQLAlchemy here.
    """
    import asyncio
    from sqlalchemy import create_engine, select as sync_select
    from sqlalchemy.orm import Session

    # Use sync engine for Celery worker context
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(sync_url)

    from app.models.booking import Booking
    from app.models.user import User

    with Session(engine) as session:
        import uuid as _uuid
        booking = session.get(Booking, _uuid.UUID(booking_id))
        if not booking:
            logger.warning("Booking %s not found for confirmation email", booking_id)
            return
        user = session.get(User, booking.user_id)
        if not user:
            return

        html = f"""
        <h2>Booking Confirmed! 🎉</h2>
        <p>Hi {user.name},</p>
        <p>Your booking <strong>{booking.booking_ref}</strong> is confirmed.</p>
        <table border="1" cellpadding="8">
            <tr><td>Booking Ref</td><td>{booking.booking_ref}</td></tr>
            <tr><td>Passenger</td><td>{booking.passenger_name}</td></tr>
            <tr><td>Amount</td><td>₹{float(booking.total_amount):.2f}</td></tr>
        </table>
        <p>Have a safe journey!</p>
        """
        try:
            _send_smtp(user.email, f"Booking Confirmed – {booking.booking_ref}", html)
            logger.info("Booking confirmation sent: %s", booking.booking_ref)
        except Exception as exc:
            raise self.retry(exc=exc)
