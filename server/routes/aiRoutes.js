const express = require("express");
const rateLimiter = require("../middleware/rateLimiter");
const aiController = require("../controllers/aiController");

const router = express.Router();

router.get("/image", rateLimiter, (req, res, next) => {
  const { place } = req.query;
  if (!place) return res.status(400).json({ error: "place is required" });
  res.json({ url: `https://source.unsplash.com/800x600/?${encodeURIComponent(place)}` });
});

router.get("/suggestions", rateLimiter, (req, res, next) => {
  if (!req.query.q) return res.status(400).json({ error: "q is required" });
  aiController.handleSuggestions(req, res, next);
});

router.get("/trending", rateLimiter, (req, res, next) => {
  res.json({
    destinations: [
      { name: "Santorini", description: "Greek island paradise" },
      { name: "Kyoto", description: "Ancient temples and gardens" },
      { name: "Swiss Alps", description: "Breathtaking mountain views" },
      { name: "Bali", description: "Tropical beaches and culture" },
      { name: "Patagonia", description: "Endless wilderness" },
    ],
  });
});

router.get("/itinerary-suggestions", rateLimiter, (req, res, next) => {
  if (!req.query.place) return res.status(400).json({ error: "place is required" });
  res.json({
    attractions: [
      { name: `${req.query.place} Tower`, description: "Iconic landmark" },
      { name: `${req.query.place} Museum`, description: "Historical artifacts" },
      { name: `${req.query.place} River Cruise`, description: "Scenic water tour" },
      { name: `${req.query.place} Old Town`, description: "Historic district" },
      { name: `${req.query.place} Palace`, description: "Royal heritage" },
    ],
  });
});

router.get("/route-plan", rateLimiter, (req, res, next) => {
  if (!req.query.origin || !req.query.destination) return res.status(400).json({ error: "origin and destination are required" });
  aiController.handleRoutePlan(req, res, next);
});

router.get("/hotel-suggestions", rateLimiter, (req, res, next) => {
  if (!req.query.place) return res.status(400).json({ error: "place is required" });
  aiController.handleHotels(req, res, next);
});

router.post("/budget-estimate", rateLimiter, (req, res, next) => {
  if (!req.body.destination || !req.body.duration) return res.status(400).json({ error: "destination and duration are required" });
  aiController.handleBudgetEstimate(req, res, next);
});

router.get("/flight-info", rateLimiter, (req, res, next) => {
  if (!req.query.from || !req.query.to) return res.status(400).json({ error: "from and to are required" });
  aiController.handleFlightInfo(req, res, next);
});

router.post("/smart-plan", rateLimiter, (req, res, next) => {
  if (!req.body.destination) return res.status(400).json({ error: "destination is required" });
  aiController.handleSmartPlan(req, res, next);
});

module.exports = router;