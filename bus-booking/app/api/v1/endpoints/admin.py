"""
app/api/v1/endpoints/admin.py
Admin panel APIs – revenue analytics, user management, operator management.
"""
import uuid
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Query, status
from sqlalchemy import and_, func, select

from app.api.deps import AdminUser, DBSession
from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.operator import Operator
from app.models.payment import Payment, PaymentStatus
from app.models.route import Route
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.bus import BusResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Dashboard / Analytics ────────────────────────────────────────────────────

@router.get("/analytics/revenue")
async def revenue_analytics(
    db: DBSession,
    _admin: AdminUser,
    start_date: date = Query(default=(date.today() - timedelta(days=30))),
    end_date: date = Query(default=date.today()),
):
    """Revenue summary for a date range."""
    result = await db.execute(
        select(
            func.count(Payment.id).label("total_transactions"),
            func.sum(Payment.amount).label("total_revenue"),
            func.avg(Payment.amount).label("avg_transaction"),
        ).where(
            Payment.status == PaymentStatus.CAPTURED,
            func.date(Payment.created_at).between(start_date, end_date),
        )
    )
    row = result.one()
    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_transactions": row.total_transactions or 0,
        "total_revenue": float(row.total_revenue or 0),
        "avg_transaction": float(row.avg_transaction or 0),
    }


@router.get("/analytics/routes/demand")
async def route_demand(db: DBSession, _admin: AdminUser):
    """Top routes by number of bookings."""
    result = await db.execute(
        select(
            Route.source_city,
            Route.destination_city,
            func.count(Booking.id).label("booking_count"),
        )
        .join(Bus, Bus.route_id == Route.id)
        .join(Booking, Booking.bus_id == Bus.id)
        .where(Booking.status == BookingStatus.CONFIRMED)
        .group_by(Route.source_city, Route.destination_city)
        .order_by(func.count(Booking.id).desc())
        .limit(10)
    )
    return [
        {"source": r.source_city, "destination": r.destination_city, "bookings": r.booking_count}
        for r in result.all()
    ]


# ─── User management ──────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: DBSession,
    _admin: AdminUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    is_active: Optional[bool] = None,
):
    filters = [User.deleted_at.is_(None)]
    if is_active is not None:
        filters.append(User.is_active == is_active)

    offset = (page - 1) * page_size
    result = await db.execute(
        select(User).where(and_(*filters)).offset(offset).limit(page_size)
    )
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.patch("/users/{user_id}/deactivate", status_code=status.HTTP_200_OK)
async def deactivate_user(user_id: uuid.UUID, db: DBSession, _admin: AdminUser):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("User not found.")
    user.is_active = False
    await db.flush()
    return {"message": f"User {user_id} deactivated."}


# ─── Operator management ──────────────────────────────────────────────────────

@router.get("/operators")
async def list_operators(db: DBSession, _admin: AdminUser):
    result = await db.execute(select(Operator).where(Operator.deleted_at.is_(None)))
    ops = result.scalars().all()
    return [{"id": o.id, "name": o.name, "contact_email": o.contact_email, "is_active": o.is_active} for o in ops]


@router.post("/operators", status_code=status.HTTP_201_CREATED)
async def create_operator(
    name: str,
    contact_email: str,
    contact_phone: Optional[str] = None,
    db: DBSession = None,
    _admin: AdminUser = None,
):
    op = Operator(name=name, contact_email=contact_email, contact_phone=contact_phone)
    db.add(op)
    await db.flush()
    return {"id": op.id, "name": op.name}


@router.delete("/operators/{operator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_operator(operator_id: uuid.UUID, db: DBSession, _admin: AdminUser):
    result = await db.execute(select(Operator).where(Operator.id == operator_id))
    op = result.scalar_one_or_none()
    if not op:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Operator not found.")
    from datetime import datetime, timezone
    op.deleted_at = datetime.now(timezone.utc)
    await db.flush()
