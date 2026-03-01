"""
app/core/exceptions.py
Domain-specific exception hierarchy.
"""
from typing import Any, Dict, Optional


class AppException(Exception):
    """Base for all application exceptions."""

    status_code: int = 500
    code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred."

    def __init__(self, message: Optional[str] = None, details: Optional[Any] = None):
        self.message = message or self.__class__.message
        self.details = details
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            **({"details": self.details} if self.details is not None else {}),
        }


class NotFoundError(AppException):
    status_code = 404
    code = "NOT_FOUND"
    message = "Resource not found."


class ConflictError(AppException):
    status_code = 409
    code = "CONFLICT"
    message = "Resource already exists."


class AuthenticationError(AppException):
    status_code = 401
    code = "AUTHENTICATION_FAILED"
    message = "Authentication failed."


class AuthorizationError(AppException):
    status_code = 403
    code = "FORBIDDEN"
    message = "You do not have permission to perform this action."


class ValidationError(AppException):
    status_code = 422
    code = "VALIDATION_ERROR"
    message = "Validation failed."


class SeatLockError(AppException):
    status_code = 409
    code = "SEAT_LOCKED"
    message = "One or more seats are currently locked by another user."


class PaymentError(AppException):
    status_code = 402
    code = "PAYMENT_FAILED"
    message = "Payment processing failed."


class BookingError(AppException):
    status_code = 400
    code = "BOOKING_ERROR"
    message = "Booking could not be completed."
