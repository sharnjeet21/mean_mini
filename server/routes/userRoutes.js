const express = require("express");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Get all users (Superadmin only)
router.get("/", authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    console.error("Fetch users error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// Get single user (Superadmin only)
router.get("/:id", authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json(user);
  } catch (error) {
    console.error("Fetch user error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// Update user role (Superadmin only)
router.put("/:id/role", authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ 
      message: "User role updated successfully",
      user 
    });
  } catch (error) {
    console.error("Update user role error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// Toggle user active status (Superadmin only)
router.put("/:id/status", authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user 
    });
  } catch (error) {
    console.error("Update user status error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// Delete user (Superadmin only)
router.delete("/:id", authenticate, authorize('superadmin'), async (req, res) => {
  try {
    // Prevent superadmin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own account." });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Delete user error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

// Get user statistics (Superadmin only)
router.get("/stats/overview", authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    return res.json(stats);
  } catch (error) {
    console.error("Fetch user stats error:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;