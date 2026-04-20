const express = require("express");
const path    = require("path");
const fs      = require("fs");
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
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin, Postman, curl, and localhost dev
    const allowed = ["http://localhost:4200", "http://localhost:3000"];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/itinerary",     itineraryRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/role-requests", roleRequestRoutes);

// ── Serve Angular build ───────────────────────────────────────────────────────
const angularDist = path.join(__dirname, "..", "frontend", "dist", "frontend", "browser");
const indexHtml   = path.join(angularDist, "index.html");

// Log on startup so we can confirm the path in Render logs
console.log("Angular dist path:", angularDist);
console.log("index.html exists:", fs.existsSync(indexHtml));

app.use(express.static(angularDist));

// SPA fallback — all non-API GET requests return index.html
app.get(/^(?!\/api).*$/, (req, res) => {
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(500).json({
      error: "Angular build not found",
      path: angularDist,
    });
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Express error:", err.message);
  res.status(500).json({ error: err.message });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
