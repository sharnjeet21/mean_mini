const express = require('express');
const User = require('../models/User');
const {
  authenticate,
  generateToken,
  hashPassword,
  comparePassword,
} = require('../middleware/auth');

const router = express.Router();

// Task 9: Register with bcrypt password hashing
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists. Please login.' });
    }

    const hashed = await hashPassword(password);

    const user = await User.create({
      name: String(name).trim(),
      email: cleanEmail,
      password: hashed,
      role: 'user',
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// Task 9: Login with bcrypt comparison + JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Get current user profile
router.get('/profile', authenticate, (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt,
    },
  });
});

module.exports = router;
