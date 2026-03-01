# 🚌 BusGo — Bus Reservation System

<div align="center">

![BusGo Banner](https://img.shields.io/badge/BusGo-Bus%20Booking%20Platform-00e5ff?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTQgMTZjMCAxLjEuOSAyIDIgMnMyLTAuOSAyLTItMC45LTItMi0yLTIgMC45LTIgMnptMTIgMGMwIDEuMS45IDIgMiAycy0yLTAuOS0yLTItMC45LTItMi0yLTIgMC45LTIgMnpNMTkuNSA5LjVsMi41IDUuNUg0VjVoMTJ2NC41aDMuNXoiLz48L3N2Zz4=)

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**A production-grade, full-stack bus booking platform built with React 18, TypeScript, and FastAPI.**

[Live Demo](https://bus-reservation-system.vercel.app) • [Report Bug](https://github.com/NOXRahul/BUS-RESERVATION-SYSTEM/issues) • [Request Feature](https://github.com/NOXRahul/BUS-RESERVATION-SYSTEM/issues)

</div>

---

## 📸 Screenshots

| Home Page | Seat Selection | Admin Dashboard |
|-----------|---------------|-----------------|
| ![Home](https://via.placeholder.com/300x200/0d0d1a/00e5ff?text=Home+Page) | ![Seats](https://via.placeholder.com/300x200/0d0d1a/bf5fff?text=Seat+Selection) | ![Admin](https://via.placeholder.com/300x200/0d0d1a/00ff9d?text=Admin+Dashboard) |

---

## ✨ Features

### 🔐 Authentication
- JWT-based login & registration with access + refresh tokens
- Email verification flow
- Forgot password & reset password
- Role-based routing — **User** and **Admin** dashboards
- Auto token refresh via Axios interceptors
- Protected routes

### 🔍 Bus Search
- Source & destination autocomplete with debouncing
- Animated date picker
- Smart filters — AC/Non-AC, Sleeper/Seater, price slider, departure time, ratings
- Real-time search with skeleton loaders
- Error fallback UI

### 🚌 Bus Listing
- Animated glassmorphism card layout
- Operator logo, live seat availability, dynamic pricing badge
- Expandable seat preview per bus

### 💺 Interactive Seat Selection
- Graphical seat layout grid (2+2 format)
- Hover glow and selection animations
- 5-minute countdown seat lock timer
- Real-time price summary panel with GST breakdown
- Sticky mobile bottom sheet

### 💳 Razorpay Payment Flow
- Create order → Launch Razorpay modal
- Handle success/failure callbacks
- Payment verification
- Booking confirmation card
- Downloadable PDF ticket

### 👤 User Dashboard
- Upcoming & past bookings
- Cancel booking
- Payment history
- Profile editing
- Email verification status

### 📊 Admin Dashboard
- Revenue trend chart (line graph)
- Route demand bar chart
- Live KPI cards with animated counters
- Real-time activity feed
- Operator performance stats

### 🎨 UI / Design
- Dark premium theme (`#080810`) with neon cyan/purple accents
- Animated particle network background
- Glassmorphism cards with blur overlays
- Framer Motion page transitions & micro-interactions
- Theme toggle — dark/light mode
- Fully responsive: mobile-first, tablet, desktop
- Mobile bottom navigation bar
- Accessibility compliant

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 + Vite | UI framework & build tool |
| TypeScript | Type safety |
| TailwindCSS | Utility-first styling |
| Framer Motion | Animations & transitions |
| Zustand | Global state management |
| React Query | Server state & caching |
| React Hook Form + Zod | Forms & validation |
| Axios | HTTP client with interceptors |
| Razorpay JS SDK | Payment integration |
| i18n | Internationalization |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | REST API framework |
| PostgreSQL | Primary database |
| SQLAlchemy | ORM |
| JWT | Authentication |
| Razorpay API | Payment processing |
| Alembic | Database migrations |

---

## 📁 Project Structure

```
busbhai/
├── frontend/                   # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── app/                # App-level config
│   │   ├── assets/             # Static assets
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/             # Base components (Button, Card, etc.)
│   │   │   ├── forms/          # Form components
│   │   │   └── charts/         # Chart components
│   │   ├── features/           # Feature modules
│   │   │   ├── auth/           # Login, Register, Verify
│   │   │   ├── search/         # Bus search & filters
│   │   │   ├── booking/        # Seat selection & checkout
│   │   │   ├── dashboard/      # User dashboard
│   │   │   └── admin/          # Admin analytics
│   │   ├── hooks/              # Custom React hooks
│   │   ├── layouts/            # Page layout components
│   │   ├── routes/             # Route definitions & guards
│   │   ├── services/           # API service layer (Axios)
│   │   ├── store/              # Zustand state stores
│   │   ├── styles/             # Global styles
│   │   ├── types/              # TypeScript type definitions
│   │   ├── utils/              # Utility functions
│   │   ├── App.tsx
│   │   ├── BusBookingPlatform.jsx  # Main platform component
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── bus-booking/                # FastAPI backend
│   ├── app/
│   │   ├── api/                # API routes
│   │   ├── core/               # Config, security
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   └── workers/            # Background tasks
│   ├── alembic/                # DB migrations
│   ├── main.py
│   └── requirements.txt
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have these installed:
- [Node.js](https://nodejs.org/) v18+
- [Python](https://python.org/) 3.11+
- [PostgreSQL](https://postgresql.org/) 14+
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/NOXRahul/BUS-RESERVATION-SYSTEM.git
cd BUS-RESERVATION-SYSTEM
```

### 2. Backend Setup

```bash
cd bus-booking

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your database URL, JWT secret, Razorpay keys

# Run database migrations
alembic upgrade head

# Start backend server
uvicorn main:app --reload --port 8000
```

Backend will be running at: `http://localhost:8000`  
API Docs: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your API base URL and Razorpay key

# Start development server
npm run dev
```

Frontend will be running at: `http://localhost:5176`

### 4. Using Docker (Optional)

```bash
# Run everything with Docker Compose
docker-compose up --build
```

---

## ⚙️ Environment Variables

### Frontend (`frontend/.env.local`)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
VITE_APP_NAME=BusGo
VITE_APP_ENV=development
```

### Backend (`.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/busgo
SECRET_KEY=your-super-secret-jwt-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXX
RAZORPAY_KEY_SECRET=your-razorpay-secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=your-app-password

FRONTEND_URL=http://localhost:5176
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login & get JWT tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/verify-email` | Verify email with OTP |
| POST | `/auth/forgot-password` | Send reset password email |
| POST | `/auth/reset-password` | Reset password with token |

### Buses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/buses/search` | Search buses by route & date |
| GET | `/buses/{id}/seats` | Get seat availability |
| POST | `/buses/{id}/lock-seat` | Lock a seat (5 min) |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bookings/create` | Create booking |
| GET | `/bookings/my` | Get user's bookings |
| DELETE | `/bookings/{id}` | Cancel booking |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/create-order` | Create Razorpay order |
| POST | `/payments/verify` | Verify payment signature |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/analytics/revenue` | Revenue stats |
| GET | `/admin/analytics/routes` | Route demand data |
| GET | `/admin/bookings` | All bookings |

---

## 💳 Razorpay Integration

1. Create a [Razorpay account](https://razorpay.com) and get your API keys
2. Add keys to both frontend and backend `.env` files
3. Use **test mode** keys (`rzp_test_...`) for development
4. Switch to **live keys** (`rzp_live_...`) for production

Test card for payments:
```
Card Number: 4111 1111 1111 1111
Expiry: Any future date
CVV: Any 3 digits
OTP: 1234
```

---

## 🌐 Deployment

### Frontend — Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Login with GitHub
3. Click **"New Project"** → Import `BUS-RESERVATION-SYSTEM`
4. Set **Root Directory** to `frontend`
5. Add environment variables from `frontend/.env.local`
6. Click **Deploy** 🚀

### Backend — Deploy to Railway / Render

```bash
# Build command
pip install -r requirements.txt

# Start command
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Production Build

```bash
# Frontend
cd frontend
npm run build
# Output in frontend/dist/

# Preview production build locally
npm run preview
```

---

## 🧪 Running Tests

```bash
# Backend tests
cd bus-booking
pytest tests/ -v

# Frontend tests
cd frontend
npm run test
```

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch — `git checkout -b feature/AmazingFeature`
3. Commit your changes — `git commit -m 'Add some AmazingFeature'`
4. Push to the branch — `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📋 Roadmap

- [ ] Real-time seat updates via WebSocket
- [ ] Push notifications
- [ ] Multi-language support (Hindi, Tamil, Telugu)
- [ ] PWA offline support
- [ ] Mobile app (React Native)
- [ ] Loyalty points system
- [ ] Operator portal

---

## 🐛 Known Issues

- Date picker emoji rendering varies across browsers
- Mobile Safari requires manual refresh after payment

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Rahul Kafle**

[![GitHub](https://img.shields.io/badge/GitHub-NOXRahul-181717?style=flat-square&logo=github)](https://github.com/NOXRahul)
[![Email](https://img.shields.io/badge/Email-rrkafle2%40gmail.com-EA4335?style=flat-square&logo=gmail)](mailto:rrkafle2@gmail.com)

---

## 🙏 Acknowledgements

- [Framer Motion](https://www.framer.com/motion/) — Animations
- [Razorpay](https://razorpay.com/) — Payment gateway
- [ShadCN UI](https://ui.shadcn.com/) — UI components
- [FastAPI](https://fastapi.tiangolo.com/) — Backend framework
- [Vercel](https://vercel.com/) — Frontend hosting

---

<div align="center">
Made with ❤️ by <a href="https://github.com/NOXRahul">NOXRahul</a>
<br/>
⭐ Star this repo if you found it helpful!
</div>
