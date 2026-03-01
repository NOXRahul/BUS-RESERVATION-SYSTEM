import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";

// ============================================================
// DESIGN TOKENS & THEME
// ============================================================
const THEME = {
  dark: {
    bg: "#080810",
    surface: "#0d0d1a",
    card: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.08)",
    text: "#f0f0ff",
    muted: "rgba(240,240,255,0.4)",
    accent: "#00e5ff",
    accent2: "#bf5fff",
    accent3: "#ff6b6b",
    success: "#00ff9d",
    gradient: "linear-gradient(135deg, #00e5ff22, #bf5fff22)",
  },
  light: {
    bg: "#f0f4ff",
    surface: "#ffffff",
    card: "rgba(0,0,0,0.03)",
    border: "rgba(0,0,0,0.08)",
    text: "#0a0a1a",
    muted: "rgba(10,10,26,0.5)",
    accent: "#0070e0",
    accent2: "#7c3aed",
    accent3: "#e53e3e",
    success: "#00a86b",
    gradient: "linear-gradient(135deg, #0070e022, #7c3aed22)",
  },
};

// ============================================================
// MOCK DATA
// ============================================================
const CITIES = ["Mumbai", "Pune", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow", "Surat", "Nagpur", "Indore", "Bhopal", "Visakhapatnam"];

const BUSES = [
  { id: 1, operator: "VRL Travels", from: "Mumbai", to: "Pune", departure: "06:00", arrival: "09:30", duration: "3h 30m", price: 350, originalPrice: 450, seats: 12, totalSeats: 40, type: "AC Sleeper", rating: 4.7, reviews: 1240, amenities: ["WiFi", "USB", "Water", "Blanket"], logo: "🚌" },
  { id: 2, operator: "Orange Travels", from: "Mumbai", to: "Pune", departure: "08:30", arrival: "12:00", duration: "3h 30m", price: 280, originalPrice: 320, seats: 5, totalSeats: 40, type: "Non-AC Seater", rating: 4.2, reviews: 890, amenities: ["USB", "Water"], logo: "🟠" },
  { id: 3, operator: "SRS Travels", from: "Mumbai", to: "Pune", departure: "10:00", arrival: "13:30", duration: "3h 30m", price: 520, originalPrice: 600, seats: 23, totalSeats: 40, type: "AC Seater", rating: 4.9, reviews: 2100, amenities: ["WiFi", "USB", "Water", "Snacks", "Blanket"], logo: "💙" },
  { id: 4, operator: "Neeta Tours", from: "Mumbai", to: "Pune", departure: "14:00", arrival: "17:30", duration: "3h 30m", price: 420, originalPrice: 480, seats: 18, totalSeats: 40, type: "AC Sleeper", rating: 4.5, reviews: 1560, amenities: ["WiFi", "USB", "Water"], logo: "🟢" },
  { id: 5, operator: "Paulo Travels", from: "Mumbai", to: "Pune", departure: "22:00", arrival: "01:30", duration: "3h 30m", price: 650, originalPrice: 750, seats: 3, totalSeats: 40, type: "Luxury Sleeper", rating: 4.8, reviews: 980, amenities: ["WiFi", "USB", "Water", "Snacks", "Blanket", "Entertainment"], logo: "⭐" },
];

const SEAT_LAYOUT = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  number: `${Math.floor(i / 4) + 1}${["A", "B", "C", "D"][i % 4]}`,
  status: i < 12 ? "booked" : i < 15 ? "locked" : "available",
  type: i % 4 < 2 ? "window" : "aisle",
  price: i % 4 === 0 || i % 4 === 3 ? 520 : 490,
}));

const BOOKINGS = [
  { id: "BK001", bus: "VRL Travels", from: "Mumbai", to: "Pune", date: "2026-03-15", seats: ["12A", "12B"], amount: 700, status: "upcoming", pnr: "VRL2026031512A" },
  { id: "BK002", bus: "SRS Travels", from: "Pune", to: "Mumbai", date: "2026-02-20", seats: ["5C"], amount: 520, status: "completed", pnr: "SRS2026022005C" },
  { id: "BK003", bus: "Orange Travels", from: "Mumbai", to: "Nagpur", date: "2026-01-10", seats: ["8A", "8B", "8C"], amount: 840, status: "cancelled", pnr: "OT2026011008A" },
];

const ANALYTICS = {
  revenue: [
    { month: "Sep", value: 42000 }, { month: "Oct", value: 58000 }, { month: "Nov", value: 51000 },
    { month: "Dec", value: 72000 }, { month: "Jan", value: 65000 }, { month: "Feb", value: 89000 },
  ],
  routes: [
    { route: "MUM-PUN", bookings: 1240 }, { route: "DEL-BLR", bookings: 980 },
    { route: "CHN-HYD", bookings: 760 }, { route: "KOL-PAT", bookings: 520 }, { route: "AHM-SUR", bookings: 430 },
  ],
  kpis: [
    { label: "Total Revenue", value: "₹4,77,000", change: "+18.2%", icon: "💰", color: "#00e5ff" },
    { label: "Total Bookings", value: "3,842", change: "+12.5%", icon: "🎫", color: "#bf5fff" },
    { label: "Active Routes", value: "128", change: "+5", icon: "🗺️", color: "#00ff9d" },
    { label: "Operators", value: "47", change: "+3", icon: "🚌", color: "#ff6b6b" },
  ],
};

// ============================================================
// PARTICLE BACKGROUND
// ============================================================
function ParticleBackground({ theme }) {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    particles.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isDark = theme === "dark";
      particles.current.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? `rgba(0,229,255,${p.opacity * 0.6})` : `rgba(0,112,224,${p.opacity * 0.3})`;
        ctx.fill();
      });
      // Draw connections
      particles.current.forEach((p, i) => {
        particles.current.slice(i + 1).forEach((q) => {
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = isDark ? `rgba(0,229,255,${0.08 * (1 - d / 100)})` : `rgba(0,112,224,${0.05 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animRef.current); };
  }, [theme]);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

// ============================================================
// ANIMATED COUNTER
// ============================================================
function AnimatedCounter({ value, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const numVal = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;

  useEffect(() => {
    let start = 0;
    const step = numVal / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= numVal) { setDisplay(numVal); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [numVal]);

  const formatted = numVal > 1000 ? Math.floor(display).toLocaleString("en-IN") : display.toFixed(0);
  return <span>{prefix}{formatted}{suffix}</span>;
}

// ============================================================
// TOAST SYSTEM
// ============================================================
function ToastContainer({ toasts, removeToast }) {
  return (
    <div style={{ position: "fixed", bottom: 80, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
            style={{ background: t.type === "success" ? "#00ff9d22" : t.type === "error" ? "#ff6b6b22" : "#00e5ff22",
              border: `1px solid ${t.type === "success" ? "#00ff9d" : t.type === "error" ? "#ff6b6b" : "#00e5ff"}44`,
              backdropFilter: "blur(20px)", borderRadius: 12, padding: "12px 16px", color: "#fff",
              fontSize: 14, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", maxWidth: 320 }}
            onClick={() => removeToast(t.id)}>
            <span>{t.type === "success" ? "✓" : t.type === "error" ? "✗" : "ℹ"}</span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// MINI CHART (Recharts-style custom SVG)
// ============================================================
function MiniBarChart({ data, color }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
      {data.map((d, i) => (
        <motion.div key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.05 }}
          style={{ flex: 1, background: `${color}33`, borderRadius: "3px 3px 0 0", height: `${(d.value / max) * 100}%`,
            border: `1px solid ${color}44`, transformOrigin: "bottom", position: "relative" }}
          whileHover={{ background: `${color}66` }}>
          <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: 10, color, whiteSpace: "nowrap", opacity: 0 }} className="bar-label">{d.month}</div>
        </motion.div>
      ))}
    </div>
  );
}

function LineChart({ data, color }) {
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const W = 280, H = 80;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((d.value - min) / (max - min)) * (H - 10) - 5,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L${W},${H} L0,${H} Z`;

  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path d={areaD} fill="url(#areaGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
      <motion.path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} />
      {points.map((p, i) => (
        <motion.circle key={i} cx={p.x} cy={p.y} r={3} fill={color} stroke="#080810" strokeWidth={2}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + i * 0.1 }} />
      ))}
    </svg>
  );
}

// ============================================================
// GLASSMORPHISM CARD
// ============================================================
function GlassCard({ children, style = {}, className = "", hover = true, onClick }) {
  return (
    <motion.div whileHover={hover ? { y: -2, boxShadow: "0 20px 60px rgba(0,229,255,0.1)" } : undefined}
      onClick={onClick}
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)", borderRadius: 16, ...style }} className={className}>
      {children}
    </motion.div>
  );
}

// ============================================================
// SEAT GRID
// ============================================================
function SeatGrid({ selectedSeats, onSeatToggle, t }) {
  const rows = [];
  for (let r = 0; r < 10; r++) {
    rows.push(SEAT_LAYOUT.slice(r * 4, r * 4 + 4));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16, fontSize: 12, color: t.muted }}>
        {[["available", t.success, "Available"], ["booked", "#666", "Booked"], ["locked", "#ff9500", "Locked"], ["selected", t.accent, "Selected"]].map(([s, c, l]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 8px 1fr 1fr", gap: 6, maxWidth: 280, margin: "0 auto" }}>
        {rows.map((row, ri) => [
          ...row.slice(0, 2).map((seat) => (
            <SeatButton key={seat.id} seat={seat} selected={selectedSeats.includes(seat.number)} onToggle={onSeatToggle} t={t} />
          )),
          <div key={`aisle-${ri}`} style={{ gridColumn: "3" }} />,
          ...row.slice(2).map((seat) => (
            <SeatButton key={seat.id} seat={seat} selected={selectedSeats.includes(seat.number)} onToggle={onSeatToggle} t={t} />
          )),
        ])}
      </div>
    </div>
  );
}

function SeatButton({ seat, selected, onToggle, t }) {
  const isBooked = seat.status === "booked";
  const isLocked = seat.status === "locked";
  const disabled = isBooked || isLocked;

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.1, boxShadow: `0 0 12px ${t.accent}88` } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={() => !disabled && onToggle(seat.number)}
      style={{
        width: "100%", aspectRatio: "1", borderRadius: 6, border: `1px solid`,
        borderColor: selected ? t.accent : isBooked ? "#333" : isLocked ? "#ff950044" : "rgba(255,255,255,0.15)",
        background: selected ? `${t.accent}33` : isBooked ? "#1a1a1a" : isLocked ? "#ff950011" : "rgba(255,255,255,0.05)",
        color: selected ? t.accent : isBooked ? "#444" : isLocked ? "#ff9500" : t.muted,
        fontSize: 9, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      {seat.number}
    </motion.button>
  );
}

// ============================================================
// COUNTDOWN TIMER
// ============================================================
function CountdownTimer({ seconds, t }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(timer);
  }, [remaining]);
  const m = Math.floor(remaining / 60), s = remaining % 60;
  const pct = (remaining / seconds) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={36} height={36} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={18} cy={18} r={15} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={3} />
        <circle cx={18} cy={18} r={15} fill="none" stroke={remaining < 60 ? "#ff6b6b" : t.accent}
          strokeWidth={3} strokeDasharray={`${2 * Math.PI * 15}`}
          strokeDashoffset={`${2 * Math.PI * 15 * (1 - pct / 100)}`} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
      </svg>
      <span style={{ fontFamily: "monospace", fontSize: 18, color: remaining < 60 ? "#ff6b6b" : t.muted, fontWeight: 700 }}>
        {m}:{s.toString().padStart(2, "0")}
      </span>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function BusBookingPlatform() {
  const [themeMode, setThemeMode] = useState("dark");
  const [page, setPage] = useState("home");
  const [authPage, setAuthPage] = useState("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState("user");
  const [toasts, setToasts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [paymentStep, setPaymentStep] = useState("seats"); // seats | payment | success
  const [searchForm, setSearchForm] = useState({ from: "Mumbai", to: "Pune", date: "2026-03-15", passengers: 1 });
  const [loading, setLoading] = useState(false);
  const [seatTimer] = useState(300);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const t = THEME[themeMode];

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  const removeToast = (id) => setToasts((prev) => prev.filter((x) => x.id !== id));

  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      setSearchResults(BUSES.filter((b) => b.from === searchForm.from && b.to === searchForm.to));
      setLoading(false);
      setPage("results");
    }, 1200);
  };

  const handleSelectBus = (bus) => {
    setSelectedBus(bus);
    setSelectedSeats([]);
    setPaymentStep("seats");
    setPage("seats");
  };

  const handleSeatToggle = (seatNum) => {
    setSelectedSeats((prev) =>
      prev.includes(seatNum) ? prev.filter((s) => s !== seatNum) : prev.length < 6 ? [...prev, seatNum] : prev
    );
  };

  const handleProceedPayment = () => {
    if (selectedSeats.length === 0) { addToast("Please select at least one seat", "error"); return; }
    setPaymentStep("payment");
  };

  const handlePayment = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setPaymentStep("success");
      addToast("Payment successful! Booking confirmed.", "success");
    }, 2000);
  };

  const handleLogin = (role = "user") => {
    setIsLoggedIn(true);
    setUserRole(role);
    setPage("home");
    addToast(`Welcome back! Logged in as ${role}.`, "success");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPage("home");
    addToast("Logged out successfully", "info");
  };

  const bgStyle = {
    minHeight: "100vh",
    background: themeMode === "dark"
      ? "radial-gradient(ellipse at 20% 50%, #0d1a2e 0%, #080810 50%, #0d0a1a 100%)"
      : "radial-gradient(ellipse at 20% 50%, #e8f4ff 0%, #f0f4ff 50%, #f4e8ff 100%)",
    color: t.text,
    fontFamily: "'Syne', 'DM Sans', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.3); border-radius: 2px; }
        .neon-glow { text-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
        .glass { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        input, select, button { font-family: inherit; }
        input:focus, select:focus { outline: none; }
        button { cursor: pointer; }
        .shimmer { background: linear-gradient(90deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.0) 100%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
      `}</style>

      <div style={bgStyle}>
        <ParticleBackground theme={themeMode} />

        {/* NAVBAR */}
        <Navbar t={t} themeMode={themeMode} setThemeMode={setThemeMode} page={page} setPage={setPage}
          isLoggedIn={isLoggedIn} userRole={userRole} handleLogout={handleLogout} />

        {/* PAGES */}
        <AnimatePresence mode="wait">
          <motion.div key={page} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>

            {page === "home" && (
              <HomePage t={t} searchForm={searchForm} setSearchForm={setSearchForm}
                handleSearch={handleSearch} loading={loading} setPage={setPage} />
            )}
            {page === "auth" && (
              <AuthPage t={t} authPage={authPage} setAuthPage={setAuthPage} handleLogin={handleLogin} addToast={addToast} />
            )}
            {page === "results" && (
              <ResultsPage t={t} buses={searchResults} searchForm={searchForm} onSelectBus={handleSelectBus} loading={loading} />
            )}
            {page === "seats" && selectedBus && (
              <SeatsPage t={t} bus={selectedBus} selectedSeats={selectedSeats} onSeatToggle={handleSeatToggle}
                onProceed={handleProceedPayment} paymentStep={paymentStep} onPayment={handlePayment}
                seatTimer={seatTimer} loading={loading} />
            )}
            {page === "dashboard" && (
              <UserDashboard t={t} bookings={BOOKINGS} addToast={addToast} />
            )}
            {page === "admin" && (
              <AdminDashboard t={t} analytics={ANALYTICS} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* BOTTOM NAV (mobile) */}
        <BottomNav t={t} page={page} setPage={setPage} isLoggedIn={isLoggedIn} userRole={userRole} />

        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </>
  );
}

// ============================================================
// NAVBAR
// ============================================================
function Navbar({ t, themeMode, setThemeMode, page, setPage, isLoggedIn, userRole, handleLogout }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.nav initial={{ y: -80 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? (themeMode === "dark" ? "rgba(8,8,16,0.9)" : "rgba(240,244,255,0.9)") : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${t.border}` : "1px solid transparent",
        transition: "all 0.3s",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
      {/* Logo */}
      <motion.div whileHover={{ scale: 1.02 }} onClick={() => setPage("home")}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚌</div>
        <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 20, letterSpacing: -0.5,
          background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          BusGo
        </span>
      </motion.div>

      {/* Desktop Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, hideOnMobile: true }}>
        {["home", "results"].map((p) => (
          <NavBtn key={p} label={p === "home" ? "Home" : "Search"} active={page === p} onClick={() => setPage(p)} t={t} />
        ))}
        {isLoggedIn && <NavBtn label="My Trips" active={page === "dashboard"} onClick={() => setPage("dashboard")} t={t} />}
        {isLoggedIn && userRole === "admin" && <NavBtn label="Admin" active={page === "admin"} onClick={() => setPage("admin")} t={t} />}
      </div>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setThemeMode((m) => m === "dark" ? "light" : "dark")}
          style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`,
            background: t.card, color: t.text, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {themeMode === "dark" ? "☀️" : "🌙"}
        </motion.button>

        {isLoggedIn ? (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleLogout}
            style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${t.border}`,
              background: t.card, color: t.muted, fontSize: 13, fontWeight: 500 }}>
            Logout
          </motion.button>
        ) : (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setPage("auth")}
            style={{ padding: "8px 20px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
              color: "#000", fontSize: 13, fontWeight: 700 }}>
            Sign In
          </motion.button>
        )}
      </div>
    </motion.nav>
  );
}

function NavBtn({ label, active, onClick, t }) {
  return (
    <motion.button whileHover={{ scale: 1.03 }} onClick={onClick}
      style={{ padding: "6px 14px", borderRadius: 8, border: "none",
        background: active ? `${t.accent}22` : "transparent",
        color: active ? t.accent : t.muted, fontSize: 13, fontWeight: active ? 600 : 400,
        transition: "all 0.2s" }}>
      {label}
    </motion.button>
  );
}

// ============================================================
// HOME PAGE
// ============================================================
function HomePage({ t, searchForm, setSearchForm, handleSearch, loading, setPage }) {
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [focusedField, setFocusedField] = useState(null);

  const handleCityInput = (field, value) => {
    setSearchForm((f) => ({ ...f, [field]: value }));
    const suggestions = CITIES.filter((c) => c.toLowerCase().startsWith(value.toLowerCase()) && c !== searchForm[field === "from" ? "to" : "from"]);
    if (field === "from") setFromSuggestions(suggestions);
    else setToSuggestions(suggestions);
  };

  const selectCity = (field, city) => {
    setSearchForm((f) => ({ ...f, [field]: city }));
    if (field === "from") setFromSuggestions([]);
    else setToSuggestions([]);
    setFocusedField(null);
  };

  const swapCities = () => setSearchForm((f) => ({ ...f, from: f.to, to: f.from }));

  return (
    <div style={{ paddingTop: 64 }}>
      {/* Hero */}
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 24px", position: "relative", zIndex: 1 }}>

        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: "20%", left: "10%", width: 400, height: 400, borderRadius: "50%",
          background: `radial-gradient(circle, ${t.accent}15 0%, transparent 70%)`, pointerEvents: "none", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "10%", width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, ${t.accent2}15 0%, transparent 70%)`, pointerEvents: "none", filter: "blur(40px)" }} />

        {/* Headline */}
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100,
            border: `1px solid ${t.accent}33`, background: `${t.accent}11`, marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent,
              boxShadow: `0 0 10px ${t.accent}`, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 12, color: t.accent, fontWeight: 600, letterSpacing: 1 }}>INDIA'S #1 BUS BOOKING PLATFORM</span>
          </div>
          <h1 style={{ fontFamily: "Syne", fontSize: "clamp(36px, 6vw, 80px)", fontWeight: 800, lineHeight: 1.1,
            letterSpacing: -2, marginBottom: 16 }}>
            <span style={{ display: "block" }}>Travel Smart.</span>
            <span style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Book Faster.</span>
          </h1>
          <p style={{ fontSize: 18, color: t.muted, maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
            500+ operators, 10,000+ routes. Book your seat in seconds with real-time availability.
          </p>
        </motion.div>

        {/* Search Card */}
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.7 }}
          style={{ width: "100%", maxWidth: 860, background: "rgba(255,255,255,0.04)", border: `1px solid ${t.border}`,
            backdropFilter: "blur(30px)", borderRadius: 24, padding: 24, position: "relative", zIndex: 10 }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr 1fr auto", gap: 12, alignItems: "end",
            flexWrap: "wrap" }}>

            {/* From */}
            <SearchField label="From" value={searchForm.from} onChange={(v) => handleCityInput("from", v)}
              onFocus={() => setFocusedField("from")} suggestions={fromSuggestions} onSelect={(c) => selectCity("from", c)}
              icon="📍" t={t} placeholder="Departure city" />

            {/* Swap button */}
            <motion.button whileHover={{ rotate: 180, scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={swapCities}
              transition={{ duration: 0.3 }}
              style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${t.border}`,
                background: t.card, color: t.accent, fontSize: 16, marginBottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ⇄
            </motion.button>

            {/* To */}
            <SearchField label="To" value={searchForm.to} onChange={(v) => handleCityInput("to", v)}
              onFocus={() => setFocusedField("to")} suggestions={toSuggestions} onSelect={(c) => selectCity("to", c)}
              icon="🏁" t={t} placeholder="Destination city" />

            {/* Date */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, color: t.muted, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Date</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>📅</span>
                <input type="date" value={searchForm.date}
                  onChange={(e) => setSearchForm((f) => ({ ...f, date: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 12,
                    border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 14 }} />
              </div>
            </div>

            {/* Search Button */}
            <motion.button whileHover={{ scale: 1.02, boxShadow: `0 0 30px ${t.accent}44` }}
              whileTap={{ scale: 0.97 }} onClick={handleSearch} disabled={loading}
              style={{ padding: "11px 28px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                color: "#000", fontWeight: 800, fontSize: 14, fontFamily: "Syne",
                cursor: loading ? "wait" : "pointer", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 8 }}>
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  style={{ width: 16, height: 16, border: "2px solid #000", borderTopColor: "transparent", borderRadius: "50%" }} />
              ) : "🔍"}
              {loading ? "Searching..." : "Search Buses"}
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ display: "flex", gap: 40, marginTop: 40, flexWrap: "wrap", justifyContent: "center" }}>
          {[["10K+", "Routes"], ["500+", "Operators"], ["2M+", "Happy Travelers"], ["4.8★", "Rating"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "Syne", color: t.accent }}>{v}</div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Features section */}
      <div style={{ padding: "60px 24px", maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontFamily: "Syne", fontSize: 32, fontWeight: 800, textAlign: "center", marginBottom: 40 }}>
          Why choose <span style={{ color: t.accent }}>BusGo</span>?
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            { icon: "⚡", title: "Instant Booking", desc: "Book your seat in under 60 seconds with live availability" },
            { icon: "🔒", title: "Secure Payments", desc: "Razorpay-powered payments with end-to-end encryption" },
            { icon: "📱", title: "Seat Selection", desc: "Interactive seat map with real-time availability updates" },
            { icon: "🎫", title: "Instant E-Ticket", desc: "Download or share your ticket immediately after booking" },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              style={{ padding: 24, borderRadius: 16, border: `1px solid ${t.border}`, background: t.card,
                backdropFilter: "blur(20px)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: t.muted, fontSize: 14, lineHeight: 1.5 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchField({ label, value, onChange, onFocus, suggestions, onSelect, icon, t, placeholder }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
      <label style={{ fontSize: 11, color: t.muted, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>{icon}</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} placeholder={placeholder}
          style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 12,
            border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 14 }} />
      </div>
      {suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, marginTop: 4,
          background: "rgba(13,13,26,0.95)", border: `1px solid ${t.border}`, borderRadius: 12,
          backdropFilter: "blur(20px)", overflow: "hidden" }}>
          {suggestions.slice(0, 5).map((c) => (
            <div key={c} onClick={() => onSelect(c)}
              style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, transition: "background 0.15s" }}
              onMouseEnter={(e) => e.target.style.background = `${t.accent}22`}
              onMouseLeave={(e) => e.target.style.background = "transparent"}>
              📍 {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// AUTH PAGE
// ============================================================
function AuthPage({ t, authPage, setAuthPage, handleLogin, addToast }) {
  const [form, setForm] = useState({ email: "", password: "", name: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (form.password.length < 6) e.password = "Min 6 characters";
    if (authPage === "register" && form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      handleLogin(form.email.includes("admin") ? "admin" : "user");
    }, 1500);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "80px 24px", position: "relative", zIndex: 1 }}>

      <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, ${t.accent}08 0%, transparent 70%)`, pointerEvents: "none" }} />

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ width: "100%", maxWidth: 440, background: "rgba(255,255,255,0.04)",
          border: `1px solid ${t.border}`, backdropFilter: "blur(30px)", borderRadius: 24, padding: 40 }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>🚌</div>
          <h2 style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
            {authPage === "login" ? "Welcome back" : authPage === "register" ? "Create account" : "Reset password"}
          </h2>
          <p style={{ color: t.muted, fontSize: 14 }}>
            {authPage === "login" ? "Sign in to your BusGo account" : "Join thousands of happy travelers"}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, background: t.card, borderRadius: 12, padding: 4, marginBottom: 24,
          border: `1px solid ${t.border}` }}>
          {[["login", "Sign In"], ["register", "Register"]].map(([k, l]) => (
            <motion.button key={k} onClick={() => setAuthPage(k)} whileTap={{ scale: 0.97 }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                background: authPage === k ? `linear-gradient(135deg, ${t.accent}, ${t.accent2})` : "transparent",
                color: authPage === k ? "#000" : t.muted, fontSize: 13, fontWeight: authPage === k ? 700 : 400 }}>
              {l}
            </motion.button>
          ))}
        </div>

        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {authPage === "register" && (
            <FormField label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="John Doe" icon="👤" error={errors.name} t={t} />
          )}
          <FormField label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            placeholder="you@example.com" icon="✉️" error={errors.email} t={t} type="email" />
          <FormField label="Password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            placeholder="••••••••" icon="🔑" error={errors.password} t={t} type="password" />
          {authPage === "register" && (
            <FormField label="Confirm Password" value={form.confirmPassword}
              onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
              placeholder="••••••••" icon="🔑" error={errors.confirmPassword} t={t} type="password" />
          )}
        </div>

        {authPage === "login" && (
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <button onClick={() => setAuthPage("forgot")}
              style={{ background: "none", border: "none", color: t.accent, fontSize: 12, cursor: "pointer" }}>
              Forgot password?
            </button>
          </div>
        )}

        <motion.button whileHover={{ scale: 1.01, boxShadow: `0 0 30px ${t.accent}44` }}
          whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: 14, marginTop: 24, borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
            color: "#000", fontWeight: 800, fontSize: 15, fontFamily: "Syne",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              style={{ width: 18, height: 18, border: "2px solid #000", borderTopColor: "transparent", borderRadius: "50%" }} />
          ) : (authPage === "login" ? "🚀 Sign In" : "✨ Create Account")}
        </motion.button>

        {/* Demo shortcuts */}
        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: `${t.accent}08`, border: `1px solid ${t.accent}22` }}>
          <p style={{ fontSize: 12, color: t.muted, marginBottom: 8, textAlign: "center" }}>Quick Demo Access</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => handleLogin("user")}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${t.accent}44`,
                background: "transparent", color: t.accent, fontSize: 12, cursor: "pointer" }}>
              👤 User Demo
            </button>
            <button onClick={() => handleLogin("admin")}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${t.accent2}44`,
                background: "transparent", color: t.accent2, fontSize: 12, cursor: "pointer" }}>
              🛡 Admin Demo
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, icon, error, t, type = "text" }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: t.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>{icon}</span>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", padding: "11px 12px 11px 36px", borderRadius: 10,
            border: `1px solid ${error ? t.accent3 : t.border}`,
            background: t.card, color: t.text, fontSize: 14, transition: "border-color 0.2s" }} />
      </div>
      {error && <p style={{ fontSize: 11, color: t.accent3, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ============================================================
// RESULTS PAGE
// ============================================================
function ResultsPage({ t, buses, searchForm, onSelectBus, loading }) {
  const [sortBy, setSortBy] = useState("price");
  const [filters, setFilters] = useState({ ac: false, sleeper: false, maxPrice: 800 });
  const [expandedBus, setExpandedBus] = useState(null);

  const filtered = buses
    .filter((b) => {
      if (filters.ac && !b.type.includes("AC")) return false;
      if (filters.sleeper && !b.type.includes("Sleeper")) return false;
      if (b.price > filters.maxPrice) return false;
      return true;
    })
    .sort((a, b) => sortBy === "price" ? a.price - b.price : sortBy === "rating" ? b.rating - a.rating : a.departure.localeCompare(b.departure));

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", padding: "80px 24px 100px", maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800 }}>
            {searchForm.from} → {searchForm.to}
          </h2>
          <p style={{ color: t.muted, fontSize: 14 }}>{searchForm.date} • {buses.length} buses found</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["price", "rating", "departure"].map((s) => (
            <button key={s} onClick={() => setSortBy(s)}
              style={{ padding: "6px 14px", borderRadius: 8,
                border: `1px solid ${sortBy === s ? t.accent : t.border}`,
                background: sortBy === s ? `${t.accent}22` : t.card,
                color: sortBy === s ? t.accent : t.muted, fontSize: 12, fontWeight: 500 }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        {/* Filters sidebar */}
        <div style={{ height: "fit-content", position: "sticky", top: 80 }}>
          <div style={{ padding: 20, borderRadius: 16, border: `1px solid ${t.border}`, background: t.card, backdropFilter: "blur(20px)" }}>
            <h3 style={{ fontFamily: "Syne", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Filters</h3>

            {[["ac", "AC Only"], ["sleeper", "Sleeper Only"]].map(([key, label]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, cursor: "pointer" }}>
                <div onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                  style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${filters[key] ? t.accent : t.border}`,
                    background: filters[key] ? t.accent : "transparent", transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {filters[key] && <span style={{ color: "#000", fontSize: 11 }}>✓</span>}
                </div>
                <span style={{ fontSize: 14, color: t.muted }}>{label}</span>
              </label>
            ))}

            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: t.muted }}>Max Price</span>
                <span style={{ fontSize: 13, color: t.accent, fontWeight: 600 }}>₹{filters.maxPrice}</span>
              </div>
              <input type="range" min={200} max={1000} step={50} value={filters.maxPrice}
                onChange={(e) => setFilters((f) => ({ ...f, maxPrice: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: t.accent }} />
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
              <p style={{ fontSize: 12, color: t.muted, marginBottom: 8 }}>Departure Time</p>
              {[["Early Morning", "00:00-06:00"], ["Morning", "06:00-12:00"], ["Afternoon", "12:00-18:00"], ["Night", "18:00-24:00"]].map(([l, r]) => (
                <div key={l} style={{ fontSize: 12, color: t.muted, padding: "4px 0", cursor: "pointer" }}>{l} <span style={{ opacity: 0.6 }}>({r})</span></div>
              ))}
            </div>
          </div>
        </div>

        {/* Bus list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer" style={{ height: 120, borderRadius: 16, border: `1px solid ${t.border}` }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: t.muted }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <p>No buses match your filters</p>
            </div>
          ) : (
            filtered.map((bus, i) => (
              <BusCard key={bus.id} bus={bus} t={t} delay={i * 0.08}
                expanded={expandedBus === bus.id}
                onExpand={() => setExpandedBus(expandedBus === bus.id ? null : bus.id)}
                onSelect={() => onSelectBus(bus)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BusCard({ bus, t, delay, expanded, onExpand, onSelect }) {
  const seatsLeft = bus.seats;
  const urgency = seatsLeft <= 5;

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
      whileHover={{ y: -2 }}
      style={{ borderRadius: 16, border: `1px solid ${urgency ? t.accent3 + "44" : t.border}`,
        background: t.card, backdropFilter: "blur(20px)", overflow: "hidden",
        boxShadow: urgency ? `0 0 20px ${t.accent3}11` : "none" }}>

      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          {/* Operator info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${t.accent}22`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              {bus.logo}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontFamily: "Syne", fontSize: 15 }}>{bus.operator}</div>
              <div style={{ fontSize: 12, color: t.muted }}>{bus.type}</div>
            </div>
          </div>

          {/* Time */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "Syne" }}>{bus.departure}</div>
              <div style={{ fontSize: 11, color: t.muted }}>{bus.from}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 11, color: t.muted }}>{bus.duration}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.muted }} />
                <div style={{ width: 60, height: 1, background: `linear-gradient(90deg, ${t.muted}, ${t.accent})` }} />
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent }} />
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "Syne" }}>{bus.arrival}</div>
              <div style={{ fontSize: 11, color: t.muted }}>{bus.to}</div>
            </div>
          </div>

          {/* Price + actions */}
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" }}>
              <span style={{ textDecoration: "line-through", color: t.muted, fontSize: 13 }}>₹{bus.originalPrice}</span>
              <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "Syne", color: t.accent }}>₹{bus.price}</span>
            </div>
            <div style={{ fontSize: 11, marginBottom: 8 }}>
              <span style={{ color: urgency ? t.accent3 : t.success, fontWeight: 600 }}>
                {urgency ? "⚡ Only " : "✓ "}{seatsLeft} seats left
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onExpand}
                style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${t.border}`,
                  background: "transparent", color: t.muted, fontSize: 12 }}>
                {expanded ? "▲ Hide" : "▼ Seats"}
              </motion.button>
              <motion.button whileHover={{ scale: 1.03, boxShadow: `0 0 20px ${t.accent}44` }} whileTap={{ scale: 0.97 }}
                onClick={onSelect}
                style={{ padding: "7px 20px", borderRadius: 8, border: "none",
                  background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                  color: "#000", fontSize: 12, fontWeight: 700 }}>
                Book Now
              </motion.button>
            </div>
          </div>
        </div>

        {/* Rating + Amenities */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {bus.amenities.map((a) => (
              <span key={a} style={{ padding: "3px 8px", borderRadius: 6, background: `${t.accent}11`,
                border: `1px solid ${t.accent}22`, fontSize: 11, color: t.accent }}>
                {a === "WiFi" ? "📶" : a === "USB" ? "🔌" : a === "Water" ? "💧" : a === "Snacks" ? "🍿" : a === "Blanket" ? "🛏️" : "🎬"} {a}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "#ffd700", fontSize: 13 }}>★</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{bus.rating}</span>
            <span style={{ color: t.muted, fontSize: 12 }}>({bus.reviews.toLocaleString()})</span>
          </div>
        </div>
      </div>

      {/* Expanded seat preview */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${t.border}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4, paddingTop: 16 }}>
                {SEAT_LAYOUT.slice(0, 20).map((s) => (
                  <div key={s.id} style={{ aspectRatio: "1", borderRadius: 4,
                    background: s.status === "booked" ? "#1a1a1a" : s.status === "locked" ? "#ff950022" : `${t.accent}22`,
                    border: `1px solid ${s.status === "booked" ? "#333" : s.status === "locked" ? "#ff950044" : t.accent + "44"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: t.muted }} />
                ))}
              </div>
              <p style={{ fontSize: 11, color: t.muted, marginTop: 8 }}>Showing first 20 seats preview</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================
// SEATS PAGE
// ============================================================
function SeatsPage({ t, bus, selectedSeats, onSeatToggle, onProceed, paymentStep, onPayment, seatTimer, loading }) {
  const totalPrice = selectedSeats.length * bus.price;

  if (paymentStep === "success") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "80px 24px", position: "relative", zIndex: 1 }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: 2, duration: 0.4 }}
            style={{ width: 80, height: 80, borderRadius: "50%",
              background: `linear-gradient(135deg, ${t.success}, #00cc7a)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 24px" }}>
            ✓
          </motion.div>
          <h2 style={{ fontFamily: "Syne", fontSize: 32, fontWeight: 800, marginBottom: 8, color: t.success }}>Booking Confirmed!</h2>
          <p style={{ color: t.muted, marginBottom: 32 }}>Your seats {selectedSeats.join(", ")} on {bus.operator} are confirmed.</p>

          <div style={{ padding: 24, borderRadius: 16, border: `1px solid ${t.border}`, background: t.card,
            backdropFilter: "blur(20px)", marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, textAlign: "left" }}>
              {[["PNR", "BK" + Date.now().toString().slice(-6)], ["Bus", bus.operator], ["Route", `${bus.from} → ${bus.to}`],
                ["Departure", bus.departure], ["Seats", selectedSeats.join(", ")], ["Amount", `₹${totalPrice}`]].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase" }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ padding: "12px 32px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
              color: "#000", fontWeight: 700, fontSize: 14 }}>
            📥 Download Ticket
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", padding: "80px 24px 100px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800 }}>
            {paymentStep === "seats" ? "Select Your Seats" : "Complete Payment"}
          </h2>
          <p style={{ color: t.muted, fontSize: 14 }}>{bus.operator} • {bus.from} → {bus.to} • {bus.departure}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
          {/* Main content */}
          <div>
            {paymentStep === "seats" ? (
              <div style={{ padding: 24, borderRadius: 16, border: `1px solid ${t.border}`, background: t.card, backdropFilter: "blur(20px)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 700 }}>Bus Layout</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: t.muted }}>Seat lock expires:</span>
                    <CountdownTimer seconds={seatTimer} t={t} />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 20, padding: "12px 0",
                  borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: 12, color: t.muted }}>🖥️ Driver</span>
                  <span style={{ fontSize: 12, color: t.accent }}>→ Front</span>
                </div>
                <SeatGrid selectedSeats={selectedSeats} onSeatToggle={onSeatToggle} t={t} />
              </div>
            ) : (
              <PaymentForm t={t} bus={bus} selectedSeats={selectedSeats} totalPrice={totalPrice}
                onPayment={onPayment} loading={loading} />
            )}
          </div>

          {/* Summary panel */}
          <div style={{ position: "sticky", top: 80 }}>
            <div style={{ padding: 24, borderRadius: 16, border: `1px solid ${t.border}`, background: t.card, backdropFilter: "blur(20px)" }}>
              <h3 style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Booking Summary</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {[["Operator", bus.operator], ["Route", `${bus.from} → ${bus.to}`],
                  ["Departure", bus.departure], ["Type", bus.type]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: t.muted }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: t.muted, marginBottom: 8 }}>Selected Seats</div>
                {selectedSeats.length === 0 ? (
                  <p style={{ fontSize: 13, color: t.muted, fontStyle: "italic" }}>No seats selected</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedSeats.map((s) => (
                      <motion.span key={s} initial={{ scale: 0 }} animate={{ scale: 1 }}
                        style={{ padding: "4px 10px", borderRadius: 6,
                          background: `${t.accent}22`, border: `1px solid ${t.accent}44`,
                          color: t.accent, fontSize: 12, fontWeight: 600 }}>
                        {s}
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16, marginBottom: 20 }}>
                {[["Base Fare", `₹${bus.price} × ${selectedSeats.length}`],
                  ["Convenience Fee", `₹${Math.round(totalPrice * 0.02)}`],
                  ["GST", `₹${Math.round(totalPrice * 0.05)}`]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: t.muted }}>{k}</span>
                    <span style={{ fontSize: 13 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12,
                  borderTop: `1px solid ${t.border}`, marginTop: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "Syne" }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "Syne", color: t.accent }}>
                    ₹{totalPrice + Math.round(totalPrice * 0.07)}
                  </span>
                </div>
              </div>

              <motion.button whileHover={{ scale: 1.02, boxShadow: `0 0 30px ${t.accent}44` }}
                whileTap={{ scale: 0.97 }}
                onClick={paymentStep === "seats" ? onProceed : onPayment}
                disabled={loading}
                style={{ width: "100%", padding: 14, borderRadius: 12, border: "none",
                  background: selectedSeats.length === 0 ? t.border : `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                  color: selectedSeats.length === 0 ? t.muted : "#000",
                  fontWeight: 800, fontSize: 14, fontFamily: "Syne",
                  cursor: selectedSeats.length === 0 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    style={{ width: 18, height: 18, border: "2px solid #000", borderTopColor: "transparent", borderRadius: "50%" }} />
                ) : (paymentStep === "seats" ? "Proceed to Payment →" : "🔐 Pay with Razorpay")}
              </motion.button>

              {paymentStep === "payment" && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: t.muted }}>🔒 Secured by</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#528FF0" }}>Razorpay</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentForm({ t, bus, selectedSeats, totalPrice, onPayment, loading }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  return (
    <div style={{ padding: 24, borderRadius: 16, border: `1px solid ${t.border}`, background: t.card, backdropFilter: "blur(20px)" }}>
      <h3 style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Passenger Details</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FormField label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="As per ID" icon="👤" t={t} />
        <FormField label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          placeholder="ticket@example.com" icon="✉️" t={t} type="email" />
        <FormField label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
          placeholder="+91 98765 43210" icon="📱" t={t} />
      </div>

      <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: `${t.accent}08`, border: `1px solid ${t.accent}22` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#528FF0",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💳</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Razorpay Checkout</div>
            <div style={{ fontSize: 11, color: t.muted }}>UPI, Cards, Net Banking, Wallets</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["💳 Card", "📱 UPI", "🏦 NetBanking", "👛 Wallet"].map((m) => (
            <span key={m} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)",
              border: `1px solid ${t.border}`, fontSize: 12, color: t.muted }}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// USER DASHBOARD
// ============================================================
function UserDashboard({ t, bookings, addToast }) {
  const [activeTab, setActiveTab] = useState("upcoming");

  const filtered = bookings.filter((b) =>
    activeTab === "upcoming" ? b.status === "upcoming" :
    activeTab === "past" ? b.status === "completed" : b.status === "cancelled"
  );

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", padding: "80px 24px 100px", maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}>
      {/* Profile Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, padding: 24,
        borderRadius: 16, border: `1px solid ${t.border}`, background: t.card, backdropFilter: "blur(20px)" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%",
          background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
          👤
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "Syne", fontSize: 20, fontWeight: 800 }}>John Traveler</h2>
          <p style={{ color: t.muted, fontSize: 13 }}>john@example.com</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
          borderRadius: 8, background: `${t.success}22`, border: `1px solid ${t.success}44` }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.success }} />
          <span style={{ fontSize: 12, color: t.success, fontWeight: 600 }}>Verified</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[["🎫", "Total Trips", "12"], ["💰", "Amount Spent", "₹8,420"], ["⭐", "Avg Rating", "4.8"]].map(([icon, label, val]) => (
          <div key={label} style={{ padding: 20, borderRadius: 12, border: `1px solid ${t.border}`,
            background: t.card, backdropFilter: "blur(20px)", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "Syne" }}>{val}</div>
            <div style={{ fontSize: 12, color: t.muted }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4,
        background: t.card, borderRadius: 12, border: `1px solid ${t.border}`, width: "fit-content" }}>
        {[["upcoming", "Upcoming"], ["past", "Past"], ["cancelled", "Cancelled"]].map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none",
              background: activeTab === k ? `linear-gradient(135deg, ${t.accent}, ${t.accent2})` : "transparent",
              color: activeTab === k ? "#000" : t.muted, fontSize: 13, fontWeight: activeTab === k ? 700 : 400 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Bookings */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: t.muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
            <p>No {activeTab} bookings</p>
          </div>
        ) : filtered.map((b, i) => (
          <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            style={{ padding: 20, borderRadius: 16, border: `1px solid ${t.border}`, background: t.card, backdropFilter: "blur(20px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontFamily: "Syne", fontSize: 16, marginBottom: 4 }}>{b.bus}</div>
                <div style={{ fontSize: 14, color: t.muted }}>{b.from} → {b.to} • {b.date}</div>
                <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>Seats: {b.seats.join(", ")} • PNR: {b.pnr}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "Syne", color: t.accent }}>₹{b.amount}</div>
                <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, marginTop: 4,
                  background: b.status === "upcoming" ? `${t.accent}22` : b.status === "completed" ? `${t.success}22` : "#ff6b6b22",
                  color: b.status === "upcoming" ? t.accent : b.status === "completed" ? t.success : "#ff6b6b",
                  border: `1px solid ${b.status === "upcoming" ? t.accent + "44" : b.status === "completed" ? t.success + "44" : "#ff6b6b44"}` }}>
                  {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                </div>
              </div>
            </div>
            {b.status === "upcoming" && (
              <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${t.accent}44`,
                    background: `${t.accent}11`, color: t.accent, fontSize: 12, fontWeight: 600 }}>
                  📥 Download Ticket
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => addToast("Cancellation requested", "info")}
                  style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #ff6b6b44",
                    background: "#ff6b6b11", color: "#ff6b6b", fontSize: 12, fontWeight: 600 }}>
                  ✗ Cancel
                </motion.button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
function AdminDashboard({ t, analytics }) {
  const [activeMetric, setActiveMetric] = useState("revenue");

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", padding: "80px 24px 100px", maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800 }}>Admin Dashboard</h2>
        <p style={{ color: t.muted, fontSize: 14 }}>Real-time platform analytics & performance</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        {analytics.kpis.map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            whileHover={{ y: -2, boxShadow: `0 20px 60px ${kpi.color}22` }}
            style={{ padding: 20, borderRadius: 16, border: `1px solid ${kpi.color}22`,
              background: t.card, backdropFilter: "blur(20px)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "0 0 0 80px",
              background: `${kpi.color}08` }} />
            <div style={{ fontSize: 28, marginBottom: 8 }}>{kpi.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "Syne", color: kpi.color }}>
              <AnimatedCounter value={kpi.value} />
            </div>
            <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>{kpi.label}</div>
            <div style={{ fontSize: 12, color: t.success, marginTop: 6, fontWeight: 600 }}>↑ {kpi.change} vs last month</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Revenue Chart */}
        <div style={{ padding: 24, borderRadius: 16, border: `1px solid ${t.border}`, background: t.card, backdropFilter: "blur(20px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Syne", fontSize: 15, fontWeight: 700 }}>Revenue Trend</h3>
            <span style={{ fontSize: 12, color: t.accent, fontWeight: 600 }}>Last 6 Months</span>
          </div>
          <LineChart data={analytics.revenue} color={t.accent} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {analytics.revenue.map((d) => (
              <span key={d.month} style={{ fontSize: 10, color: t.muted }}>{d.month}</span>
            ))}
          </div>
        </div>

        {/* Route Demand */}
        <div style={{ padding: 24, borderRadius: 16, border: `1px solid ${t.border}`, background: t.card, backdropFilter: "blur(20px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Syne", fontSize: 15, fontWeight: 700 }}>Top Routes</h3>
            <span style={{ fontSize: 12, color: t.accent2, fontWeight: 600 }}>By Bookings</span>
          </div>
          {analytics.routes.map((r, i) => {
            const max = analytics.routes[0].bookings;
            return (
              <div key={r.route} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{r.route}</span>
                  <span style={{ fontSize: 12, color: t.muted }}>{r.bookings.toLocaleString()}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(r.bookings / max) * 100}%` }}
                    transition={{ delay: i * 0.1, duration: 0.8 }}
                    style={{ height: "100%", borderRadius: 3,
                      background: `linear-gradient(90deg, ${t.accent2}, ${t.accent})` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Trends Bar Chart */}
      <div style={{ padding: 24, borderRadius: 16, border: `1px solid ${t.border}`, background: t.card, backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "Syne", fontSize: 15, fontWeight: 700 }}>Monthly Bookings</h3>
          <div style={{ display: "flex", gap: 6 }}>
            {["revenue", "bookings"].map((m) => (
              <button key={m} onClick={() => setActiveMetric(m)}
                style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${activeMetric === m ? t.accent : t.border}`,
                  background: activeMetric === m ? `${t.accent}22` : "transparent",
                  color: activeMetric === m ? t.accent : t.muted, fontSize: 11 }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <MiniBarChart data={analytics.revenue} color={t.accent} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {analytics.revenue.map((d) => (
            <span key={d.month} style={{ fontSize: 10, color: t.muted, textAlign: "center", flex: 1 }}>{d.month}</span>
          ))}
        </div>
      </div>

      {/* Live Activity */}
      <div style={{ marginTop: 20, padding: 24, borderRadius: 16, border: `1px solid ${t.border}`, background: t.card, backdropFilter: "blur(20px)" }}>
        <h3 style={{ fontFamily: "Syne", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.success,
              boxShadow: `0 0 10px ${t.success}`, display: "inline-block",
              animation: "pulse 2s infinite" }} />
            Live Activity Feed
          </span>
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "✅", msg: "New booking: Mumbai → Pune (VRL Travels)", time: "2s ago", color: t.success },
            { icon: "💰", msg: "Payment verified: ₹1,040 from Priya S.", time: "15s ago", color: t.accent },
            { icon: "🚌", msg: "New operator registered: Raj Travels", time: "1m ago", color: t.accent2 },
            { icon: "⚠️", msg: "Seat lock expired: Bus 47, Seat 12A", time: "3m ago", color: "#ff9500" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
                background: `${item.color}08`, border: `1px solid ${item.color}22` }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{item.msg}</span>
              <span style={{ fontSize: 11, color: t.muted, whiteSpace: "nowrap" }}>{item.time}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM NAV (Mobile)
// ============================================================
function BottomNav({ t, page, setPage, isLoggedIn, userRole }) {
  const items = [
    { icon: "🏠", label: "Home", key: "home" },
    { icon: "🔍", label: "Search", key: "results" },
    { icon: "🎫", label: "My Trips", key: "dashboard" },
    { icon: "👤", label: "Account", key: "auth" },
  ];
  if (isLoggedIn && userRole === "admin") items[3] = { icon: "📊", label: "Admin", key: "admin" };

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 999,
      background: "rgba(8,8,16,0.95)", backdropFilter: "blur(30px)",
      borderTop: `1px solid ${t.border}`, padding: "8px 0", display: "flex",
      justifyContent: "space-around" }}>
      {items.map((item) => (
        <motion.button key={item.key} whileTap={{ scale: 0.9 }} onClick={() => setPage(item.key)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: "none", border: "none", padding: "6px 12px", color: page === item.key ? t.accent : t.muted,
            fontSize: 11, fontWeight: page === item.key ? 600 : 400, position: "relative" }}>
          {page === item.key && (
            <motion.div layoutId="nav-indicator"
              style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                width: 32, height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})` }} />
          )}
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span>{item.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
