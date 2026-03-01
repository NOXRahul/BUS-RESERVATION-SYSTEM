# 🚌 BusBooking API – Production-Grade Backend

A startup-ready, scalable bus booking platform built with FastAPI, PostgreSQL, Redis, and Razorpay.

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Client (Web / Mobile)                                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────────────┐
│  Nginx / Render Load Balancer                                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│  FastAPI (4 Uvicorn workers)  /api/v1/                          │
│  ├── Auth (JWT + refresh tokens)                                │
│  ├── Bus Search (Redis-cached)                                  │
│  ├── Bookings (Redis seat locks)                                │
│  ├── Payments (Razorpay)                                        │
│  └── Admin Panel                                                │
└──────┬──────────────────────────────┬───────────────────────────┘
       │                              │
┌──────▼──────┐              ┌────────▼────────┐
│ PostgreSQL  │              │  Redis          │
│  (Primary)  │              │  ├── Seat locks │
│             │              │  ├── Search cache│
│             │              │  └── Celery jobs│
└─────────────┘              └─────────────────┘
                                      │
                             ┌────────▼────────┐
                             │ Celery Workers  │
                             │ ├── Emails      │
                             │ └── Waitlist    │
                             └─────────────────┘
```

---

## 📁 Project Structure

```
bus-booking/
├── app/
│   ├── api/
│   │   ├── deps.py              # FastAPI dependencies (auth, DB)
│   │   └── v1/
│   │       ├── router.py        # Aggregates all routers
│   │       └── endpoints/
│   │           ├── auth.py      # Register, login, refresh, reset
│   │           ├── buses.py     # Search, CRUD (admin)
│   │           ├── bookings.py  # Seat lock, create, cancel
│   │           ├── payments.py  # Razorpay order, verify, webhook
│   │           └── admin.py     # Analytics, user/operator mgmt
│   ├── core/
│   │   ├── config.py            # Pydantic settings from .env
│   │   ├── exceptions.py        # Domain exception hierarchy
│   │   └── security.py          # JWT + bcrypt utilities
│   ├── db/
│   │   ├── session.py           # Async SQLAlchemy engine + session
│   │   └── redis.py             # Redis pool + seat locking + cache
│   ├── middleware/
│   │   ├── logging.py           # Structured request/response logging
│   │   └── exception_handler.py # Maps exceptions to JSON responses
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── user.py              # User, Role, RefreshToken
│   │   ├── operator.py          # Operator
│   │   ├── bus.py               # Bus (AC/Non-AC, Sleeper/Seater)
│   │   ├── route.py             # Source-Destination routes
│   │   ├── seat.py              # Seat + status
│   │   ├── booking.py           # Booking, BookingSeat, Waitlist
│   │   ├── payment.py           # Payment (Razorpay tracking)
│   │   └── review.py            # User reviews
│   ├── schemas/                 # Pydantic schemas (request/response)
│   ├── services/                # Business logic layer
│   ├── utils/
│   │   └── logging_config.py    # JSON structured logging setup
│   ├── workers/
│   │   ├── celery_app.py        # Celery configuration
│   │   ├── email_tasks.py       # Verification, reset, confirmation
│   │   └── booking_tasks.py     # Waitlist processing
│   └── main.py                  # FastAPI app factory
├── alembic/                     # Database migrations
├── tests/                       # pytest tests
├── .github/workflows/ci.yml     # GitHub Actions CI/CD
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## 🔑 Key Design Decisions

### Seat Locking (Redis)
```
User calls POST /api/v1/bookings/seats/lock
  → Redis SET seat_lock:{seat_id} {user_id} NX EX 300
  → Atomic: fails instantly if locked by another user
  → 5-minute TTL auto-expires
  → Lua script used for atomic release (only owner can release)

User creates booking
  → Verifies Redis lock ownership
  → Marks seat as BOOKED in PostgreSQL
  → Releases Redis locks (no longer needed)
```

### Search Caching (Redis)
```
GET /api/v1/buses/search?source=Delhi&destination=Mumbai&date=2024-03-15
  → Hash all params → Redis key
  → Cache hit: return immediately
  → Cache miss: query PostgreSQL, store 5 min TTL
  → Bus create/update/delete: invalidate bus_search:* pattern
```

### Token Architecture
```
Access Token:  JWT, 30 min TTL, contains user_id + role
Refresh Token: JWT, 7 days TTL, stored in PostgreSQL
  → Rotation on each refresh (revoke old, issue new)
  → Revocable via DB flag
```

---

## 🚀 Quick Start (Docker)

```bash
# 1. Clone and configure
git clone https://github.com/your-org/bus-booking.git
cd bus-booking
cp .env.example .env
# Edit .env with your values

# 2. Start all services
docker-compose up -d

# 3. Run migrations
docker-compose exec api alembic upgrade head

# 4. Seed initial admin role (first time only)
docker-compose exec api python -c "
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import Role, RoleEnum
async def seed():
    async with AsyncSessionLocal() as db:
        for role_name in RoleEnum:
            db.add(Role(name=role_name, description=f'{role_name} role'))
        await db.commit()
asyncio.run(seed())
"

# 5. API is live at http://localhost:8000
# 6. API docs at http://localhost:8000/docs (DEBUG=true only)
# 7. Flower (Celery monitoring) at http://localhost:5555
```

---

## 🔐 Authentication Flow

```bash
# 1. Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"SecurePass1"}'

# 2. Verify email (token from email)
curl -X POST http://localhost:8000/api/v1/auth/verify-email \
  -d '{"token":"<token-from-email>"}'

# 3. Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -d '{"email":"john@example.com","password":"SecurePass1"}'
# Returns: {"access_token":"...", "refresh_token":"..."}

# 4. Use access token
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

## 🎫 Booking Flow

```bash
# 1. Search buses
curl "http://localhost:8000/api/v1/buses/search?source=Delhi&destination=Mumbai&date=2024-03-15"

# 2. Check seats for a bus
curl http://localhost:8000/api/v1/buses/{bus_id}/seats

# 3. Lock seats (5-min hold)
curl -X POST http://localhost:8000/api/v1/bookings/seats/lock \
  -H "Authorization: Bearer <token>" \
  -d '{"seat_ids":["seat-uuid-1","seat-uuid-2"]}'

# 4. Create booking
curl -X POST http://localhost:8000/api/v1/bookings \
  -H "Authorization: Bearer <token>" \
  -d '{"bus_id":"...","seat_ids":["..."],"passenger_name":"John Doe"}'

# 5. Create payment order
curl -X POST http://localhost:8000/api/v1/payments/orders \
  -H "Authorization: Bearer <token>" \
  -d '{"booking_id":"..."}'
# → Use razorpay_order_id in Razorpay JS SDK on frontend

# 6. Verify payment after frontend callback
curl -X POST http://localhost:8000/api/v1/payments/verify \
  -H "Authorization: Bearer <token>" \
  -d '{"razorpay_order_id":"...","razorpay_payment_id":"...","razorpay_signature":"..."}'
```

---

## 📦 Deployment

### Render.com (Recommended for MVP)

1. Create a **PostgreSQL** and **Redis** instance on Render
2. Create a new **Web Service** pointing to your GitHub repo
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all env vars from `.env.example` in the Render dashboard
6. Add a **Cron Job** service for Celery beat if needed

### Railway.app (Alternative)

```toml
# railway.toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
```

### Production Checklist
- [ ] Set `DEBUG=false`
- [ ] Use strong random `SECRET_KEY` (32+ chars)
- [ ] Set real `ALLOWED_ORIGINS` (no wildcards)
- [ ] Configure Sentry DSN for error monitoring
- [ ] Set up PostgreSQL read replicas for search queries
- [ ] Enable Redis persistence (`appendonly yes`)
- [ ] Configure Razorpay live keys
- [ ] Set up SMTP with production email provider (SendGrid/SES)
- [ ] Add rate limiting at infrastructure level (Cloudflare / nginx)
- [ ] Enable PostgreSQL SSL: `?ssl=require` in DATABASE_URL

---

## 🧪 Running Tests

```bash
# Run all tests
pytest

# With coverage report
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v

# Run only unit tests (fast)
pytest tests/ -m "not integration" -v
```

---

## 📊 Database Migrations

```bash
# Create new migration after model changes
alembic revision --autogenerate -m "add_new_table"

# Apply all pending migrations
alembic upgrade head

# Roll back one step
alembic downgrade -1

# View migration history
alembic history --verbose
```

---

## 🛡 Security Features

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt via passlib |
| JWT signing | HS256 with 32-char secret |
| Token rotation | Refresh tokens stored + revocable in DB |
| Rate limiting | slowapi (60 req/min default) |
| CORS | Explicit origin allowlist |
| SQL injection | SQLAlchemy ORM (parameterized) |
| Input validation | Pydantic v2 with strict types |
| Payment verification | HMAC-SHA256 signature check |
| Webhook verification | HMAC-SHA256 before processing |
| User enumeration | Password reset always returns 202 |
| Soft deletes | `deleted_at` on User, Bus, Operator |

---

## 📡 API Endpoints Summary

```
Auth
  POST   /api/v1/auth/register
  POST   /api/v1/auth/verify-email
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh
  POST   /api/v1/auth/password-reset/request
  POST   /api/v1/auth/password-reset/confirm
  GET    /api/v1/auth/me

Buses
  GET    /api/v1/buses/search
  GET    /api/v1/buses/{id}
  GET    /api/v1/buses/{id}/seats
  POST   /api/v1/buses         [admin]
  PATCH  /api/v1/buses/{id}    [admin]
  DELETE /api/v1/buses/{id}    [admin]

Bookings
  POST   /api/v1/bookings/seats/lock
  POST   /api/v1/bookings/seats/unlock
  POST   /api/v1/bookings
  GET    /api/v1/bookings
  GET    /api/v1/bookings/{id}
  POST   /api/v1/bookings/{id}/cancel
  POST   /api/v1/bookings/waitlist

Payments
  POST   /api/v1/payments/orders
  POST   /api/v1/payments/verify
  POST   /api/v1/payments/webhook

Admin
  GET    /api/v1/admin/analytics/revenue
  GET    /api/v1/admin/analytics/routes/demand
  GET    /api/v1/admin/users
  PATCH  /api/v1/admin/users/{id}/deactivate
  GET    /api/v1/admin/operators
  POST   /api/v1/admin/operators
  DELETE /api/v1/admin/operators/{id}

System
  GET    /health
```
