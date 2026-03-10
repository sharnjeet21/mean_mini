const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const itineraryRoutes = require("./routes/itineraryRoutes");
const userRoutes = require("./routes/userRoutes");
const roleRequestRoutes = require("./routes/roleRequestRoutes");

dotenv.config();

const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, "..", "views")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "register.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "dashboard.html"));
});

app.get("/request-admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "request-admin.html"));
});

app.use("/api/auth", authRoutes);
app.use("/api/itinerary", itineraryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/role-requests", roleRequestRoutes);

const PORT = process.env.PORT || 5000;

// For Vercel deployment
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
