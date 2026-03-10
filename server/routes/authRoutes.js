const express = require("express");
const User = require("../models/User");
const { authenticate, authorize, createSession, destroySession } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required." 
      });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required." 
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "User already exists. Please login." 
      });
    }

    const user = new User({
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      role: 'user', // Default role is user
    });
    await user.save();

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      redirect: "/login",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({ 
      success: false,
      message: "Server error during registration." 
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email and password are required." 
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user || user.password !== cleanPassword || !user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password." 
      });
    }

    const sessionId = createSession(user._id);

    return res.json({
      success: true,
      message: "Login successful",
      redirect: "/dashboard",
      sessionId,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ 
      success: false,
      message: "Server error during login." 
    });
  }
});

router.post("/logout", authenticate, (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      destroySession(sessionId);
    }
    return res.json({ 
      success: true,
      message: "Logout successful" 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: "Server error during logout." 
    });
  }
});

// Get current user profile
router.get("/profile", authenticate, (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt
    }
  });
});

module.exports = router;