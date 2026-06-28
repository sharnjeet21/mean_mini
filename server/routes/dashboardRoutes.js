const express = require("express");
const { getDashboardStats } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/stats", (req, res, next) => {
  getDashboardStats(req, res, next);
});

module.exports = router;