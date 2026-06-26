const express = require("express");
const v1 = express.Router();

const authRoutes = require("./authRoutes");
const itineraryRoutes = require("./itineraryRoutes");
const userRoutes = require("./userRoutes");
const roleRequestRoutes = require("./roleRequestRoutes");
const aiRoutes = require("./aiRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const adminRoutes = require("./adminRoutes");

v1.use("/auth", authRoutes);
v1.use("/itinerary", itineraryRoutes);
v1.use("/users", userRoutes);
v1.use("/role-requests", roleRequestRoutes);
v1.use("/ai", aiRoutes);
v1.use("/dashboard", dashboardRoutes);
v1.use("/admin", adminRoutes);

v1.use((req, res) => res.status(404).json({ error: "Not found" }));

module.exports = v1;