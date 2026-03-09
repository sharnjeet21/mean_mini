const express = require("express");
const Itinerary = require("../models/Itinerary");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { destination, startDate, endDate, budget, notes } = req.body;

    if (!destination || !startDate || !endDate || budget === undefined) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    const itinerary = await Itinerary.create({
      destination,
      startDate,
      endDate,
      budget,
      notes,
    });

    return res.status(201).json(itinerary);
  } catch (error) {
    console.error("Create itinerary error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

router.get("/", async (req, res) => {
  try {
    const itineraries = await Itinerary.find().sort({ createdAt: -1 });
    return res.json(itineraries);
  } catch (error) {
    console.error("Fetch itineraries error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updated = await Itinerary.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Itinerary not found." });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Update itinerary error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Itinerary.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Itinerary not found." });
    }

    return res.json({ message: "Itinerary deleted." });
  } catch (error) {
    console.error("Delete itinerary error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
