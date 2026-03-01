"""
app/workers/booking_tasks.py
Background tasks for booking lifecycle: waitlist processing, seat expiry.
"""
import logging
import uuid

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task
def process_waitlist(bus_id: str):
    """
    Called after a cancellation. Checks waitlist and notifies next user
    if seats are now available.
    """
    from sqlalchemy import create_engine, select, func
    from sqlalchemy.orm import Session

    from app.core.config import settings
    from app.models.booking import WaitlistEntry
    from app.models.seat import Seat, SeatStatus
    from app.models.user import User

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(sync_url)

    with Session(engine) as session:
        _bus_id = uuid.UUID(bus_id)

        available_count = session.execute(
            select(func.count(Seat.id)).where(
                Seat.bus_id == _bus_id,
                Seat.status == SeatStatus.AVAILABLE,
            )
        ).scalar_one()

        if available_count == 0:
            return

        waitlist_entry = session.execute(
            select(WaitlistEntry)
            .where(WaitlistEntry.bus_id == _bus_id, WaitlistEntry.notified.is_(False))
            .order_by(WaitlistEntry.created_at)
            .limit(1)
        ).scalar_one_or_none()

        if not waitlist_entry:
            return

        user = session.get(User, waitlist_entry.user_id)
        if not user:
            return

        waitlist_entry.notified = True
        session.commit()

        from app.workers.email_tasks import _send_smtp
        from app.core.config import settings as cfg

        html = f"""
        <h2>Good news, {user.name}!</h2>
        <p>A seat is now available on your waitlisted bus. Book now before it fills up!</p>
        <a href="{cfg.FRONTEND_URL}/buses/{bus_id}" 
           style="padding:10px 20px;background:#10b981;color:white;border-radius:5px;text-decoration:none;">
           Book Now
        </a>
        """
        try:
            _send_smtp(user.email, "Seat Available – Your Waitlist Bus!", html)
            logger.info("Waitlist notification sent to %s for bus %s", user.email, bus_id)
        except Exception as exc:
            logger.error("Waitlist email failed: %s", exc)
