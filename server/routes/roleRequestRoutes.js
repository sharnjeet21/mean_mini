const express = require("express");
const RoleRequest = require("../models/RoleRequest");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Submit role request (Users only)
router.post("/", authenticate, authorize('user'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ 
        success: false,
        message: "Please provide a detailed reason (at least 10 characters)." 
      });
    }

    // Check if user already has a pending request
    const existingRequest = await RoleRequest.findOne({
      userId: req.user._id,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ 
        success: false,
        message: "You already have a pending admin access request." 
      });
    }

    // Check if user already has admin role
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return res.status(400).json({ 
        success: false,
        message: "You already have admin access or higher privileges." 
      });
    }

    const roleRequest = new RoleRequest({
      userId: req.user._id,
      requestedRole: 'admin',
      reason: reason.trim(),
    });

    await roleRequest.save();

    return res.status(201).json({
      success: true,
      message: "Admin access request submitted successfully. You will be notified when it's reviewed.",
      request: {
        id: roleRequest._id,
        status: roleRequest.status,
        createdAt: roleRequest.createdAt
      }
    });
  } catch (error) {
    console.error("Role request error:", error.message);
    return res.status(500).json({ 
      success: false,
      message: "Server error while submitting request." 
    });
  }
});

// Get user's own role request
router.get("/my-request", authenticate, async (req, res) => {
  try {
    const request = await RoleRequest.findOne({
      userId: req.user._id
    }).sort({ createdAt: -1 });

    return res.json(request);
  } catch (error) {
    console.error("Get role request error:", error.message);
    return res.status(500).json({ 
      success: false,
      message: "Server error." 
    });
  }
});

// Get all role requests (Superadmin only)
router.get("/", authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const requests = await RoleRequest.find()
      .populate('userId', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json(requests);
  } catch (error) {
    console.error("Fetch role requests error:", error.message);
    return res.status(500).json({ 
      success: false,
      message: "Server error." 
    });
  }
});

// Review role request (Superadmin only)
router.put("/:id/review", authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid status. Must be 'approved' or 'rejected'." 
      });
    }

    const request = await RoleRequest.findById(req.params.id).populate('userId');

    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: "Role request not found." 
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: "This request has already been reviewed." 
      });
    }

    // Update the role request
    request.status = status;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewNotes = reviewNotes || '';
    await request.save();

    // If approved, update user role
    if (status === 'approved') {
      await User.findByIdAndUpdate(request.userId._id, { role: 'admin' });
    }

    return res.json({
      success: true,
      message: `Role request ${status} successfully.`,
      request: {
        id: request._id,
        status: request.status,
        reviewedAt: request.reviewedAt,
        reviewNotes: request.reviewNotes
      }
    });
  } catch (error) {
    console.error("Review role request error:", error.message);
    return res.status(500).json({ 
      success: false,
      message: "Server error while reviewing request." 
    });
  }
});

// Delete role request (Superadmin only)
router.delete("/:id", authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const request = await RoleRequest.findByIdAndDelete(req.params.id);

    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: "Role request not found." 
      });
    }

    return res.json({ 
      success: true,
      message: "Role request deleted successfully." 
    });
  } catch (error) {
    console.error("Delete role request error:", error.message);
    return res.status(500).json({ 
      success: false,
      message: "Server error." 
    });
  }
});

module.exports = router;