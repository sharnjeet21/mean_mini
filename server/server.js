const dotenv  = require("dotenv");
dotenv.config();

const express = require("express");
const path    = require("path");
const fs      = require("fs");
const cors    = require("cors");
const mongoose = require("mongoose");

const connectDB          = require("./config/db");
const apiRoutes          = require("./routes");
const { notFound, globalErrorHandler } = require("./middleware/errorHandler");
const { createSocketServer } = require("./utils/socket");

const app = express();

function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    success: false,
    message: "The database is unavailable. Please wait a moment and try again.",
  });
}

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── API routes — CORS only applies here, not to static files ─────────────────
const apiCors = cors({
  origin(origin, callback) {
    const configuredOrigins = String(process.env.CLIENT_ORIGINS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const renderOrigin = process.env.RENDER_EXTERNAL_URL;
    const allowedOrigins = [
      "http://localhost:4200",
      "http://localhost:3000",
      renderOrigin,
      ...configuredOrigins,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
});

app.get("/api/health", apiCors, (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ready" : "degraded",
    service: "travel-intelligence-api",
    database: databaseReady ? "connected" : "disconnected",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1", apiCors, requireDatabase, apiRoutes);

app.use(notFound);
app.use(globalErrorHandler);

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

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
let server;

async function startServer() {
  const database = await connectDB();
  if (!database && process.env.NODE_ENV === "production") {
    console.error("Production startup aborted because MongoDB is unavailable.");
    process.exitCode = 1;
    return;
  }

  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on 0.0.0.0:${PORT}`);
  });

  createSocketServer(server);
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down gracefully.`);

  const closeDatabase = async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await connectDB.stopDevelopmentDatabase();
  };

  if (!server) {
    await closeDatabase();
    process.exit(0);
  }

  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

if (require.main === module) {
  startServer();
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = app;