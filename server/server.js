const express = require("express");
const path    = require("path");
const dotenv  = require("dotenv");
const cors    = require("cors");

const connectDB          = require("./config/db");
const authRoutes         = require("./routes/authRoutes");
const itineraryRoutes    = require("./routes/itineraryRoutes");
const userRoutes         = require("./routes/userRoutes");
const roleRequestRoutes  = require("./routes/roleRequestRoutes");

dotenv.config();

const app = express();

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ── CORS ──────────────────────────────────────────────────────────────────────
// In production Angular is served by this same Express server (same origin),
// so CORS is only needed for local development (localhost:4200).
const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:3000",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // No origin = Postman / curl / same-origin requests — always allow
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── API routes (must come BEFORE static file serving) ────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/itinerary",     itineraryRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/role-requests", roleRequestRoutes);

// ── Serve Angular production build ────────────────────────────────────────────
const angularDist = path.join(__dirname, "..", "frontend", "dist", "frontend", "browser");

app.use(express.static(angularDist));

// ── SPA fallback — send index.html for any non-API route ─────────────────────
// This lets Angular's client-side router handle /dashboard, /login, etc.
app.get("*", (req, res) => {
  res.sendFile(path.join(angularDist, "index.html"));
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
