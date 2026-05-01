const express = require("express");
const Itinerary = require("../models/Itinerary");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Create itinerary (All authenticated users)
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      title,
      destination,
      startDate,
      endDate,
      duration,
      budget,
      description,
      dailyPlan,
      tripSummary
    } = req.body;

    if (!title || !destination || !startDate || !endDate || !duration || budget === undefined) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    const itinerary = await Itinerary.create({
      title,
      destination,
      startDate,
      endDate,
      duration,
      budget,
      description,
      dailyPlan,
      tripSummary,
      createdBy: req.user._id,
    });

    await itinerary.populate('createdBy', 'name email role');
    return res.status(201).json(itinerary);
  } catch (error) {
    console.error("Create itinerary error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// Get all itineraries (All authenticated users)
router.get("/", authenticate, async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ isActive: true })
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(itineraries);
  } catch (error) {
    console.error("Fetch itineraries error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// Get single itinerary
router.get("/:id", authenticate, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('bookings.userId', 'name email');

    if (!itinerary) {
      return res.status(404).json({ message: "Itinerary not found." });
    }

    // Users can only see active itineraries
    if (req.user.role === 'user' && !itinerary.isActive) {
      return res.status(404).json({ message: "Itinerary not found." });
    }

    return res.json(itinerary);
  } catch (error) {
    console.error("Fetch itinerary error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// Update itinerary (Admin and Superadmin only)
router.put("/:id", authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const updated = await Itinerary.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email role');

    if (!updated) {
      return res.status(404).json({ message: "Itinerary not found." });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Update itinerary error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// Delete itinerary (Admin and Superadmin only)
router.delete("/:id", authenticate, authorize('admin', 'superadmin'), async (req, res) => {
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

// Book itinerary (Users only)
router.post("/:id/book", authenticate, authorize('user'), async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);

    if (!itinerary || !itinerary.isActive) {
      return res.status(404).json({ message: "Itinerary not available." });
    }

    // Check if user already booked this itinerary
    const existingBooking = itinerary.bookings.find(
      booking => booking.userId.toString() === req.user._id.toString()
    );

    if (existingBooking) {
      return res.status(400).json({ message: "You have already booked this itinerary." });
    }

    itinerary.bookings.push({
      userId: req.user._id,
      status: 'pending'
    });

    await itinerary.save();
    await itinerary.populate('bookings.userId', 'name email');

    return res.json({
      message: "Itinerary booked successfully",
      booking: itinerary.bookings[itinerary.bookings.length - 1]
    });
  } catch (error) {
    console.error("Book itinerary error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// Get user's bookings
router.get("/user/bookings", authenticate, authorize('user'), async (req, res) => {
  try {
    const itineraries = await Itinerary.find({
      'bookings.userId': req.user._id
    }).populate('createdBy', 'name email role');

    const userBookings = itineraries.map(itinerary => {
      const userBooking = itinerary.bookings.find(
        booking => booking.userId.toString() === req.user._id.toString()
      );
      return {
        ...itinerary.toObject(),
        userBooking
      };
    });

    return res.json(userBookings);
  } catch (error) {
    console.error("Fetch user bookings error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
