"""
app/api/v1/router.py
Aggregates all v1 endpoint routers.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, buses, bookings, payments, admin

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(buses.router)
api_router.include_router(bookings.router)
api_router.include_router(payments.router)
api_router.include_router(admin.router)
