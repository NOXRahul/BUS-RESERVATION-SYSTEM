"""
app/utils/logging_config.py
Configures structured JSON logging for production.
"""
import logging
import logging.config
import sys

from app.core.config import settings

LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
        },
        "standard": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "stream": sys.stdout,
            "formatter": "json" if not settings.DEBUG else "standard",
        },
    },
    "loggers": {
        "busbooking": {"handlers": ["console"], "level": "DEBUG" if settings.DEBUG else "INFO", "propagate": False},
        "uvicorn": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "sqlalchemy.engine": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
}


def setup_logging():
    logging.config.dictConfig(LOG_CONFIG)
