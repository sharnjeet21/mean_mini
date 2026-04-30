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
const aiRoutes           = require("./routes/aiRoutes");

dotenv.config();

const app = express();

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── API routes — CORS only applies here, not to static files ─────────────────
const apiCors = cors({
  origin: ["http://localhost:4200", "http://localhost:3000"],
  credentials: true,
});

app.use("/api/auth",          apiCors, authRoutes);
app.use("/api/itinerary",     apiCors, itineraryRoutes);
app.use("/api/users",         apiCors, userRoutes);
app.use("/api/role-requests", apiCors, roleRequestRoutes);
app.use("/api/ai",            apiCors, aiRoutes);
app.use("/api/image",         apiCors, require("./routes/imageRoutes"));

// ── Serve Angular build ───────────────────────────────────────────────────────
const angularDist = path.join(__dirname, "..", "frontend", "dist", "frontend", "browser");
const indexHtml   = path.join(angularDist, "index.html");

console.log("Angular dist:", angularDist);
console.log("index.html exists:", fs.existsSync(indexHtml));

app.use(express.static(angularDist));

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(500).json({ error: "Angular build not found", path: angularDist });
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Express error:", err.message);
  res.status(500).json({ error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
