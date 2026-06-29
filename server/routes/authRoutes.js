const express = require('express');
const User = require('../models/User');
const { loginUser, registerUser, authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();

    if (!cleanName || !cleanEmail || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 80 characters.' });
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (String(password).length < 8 || String(password).length > 128) {
      return res.status(400).json({ success: false, message: 'Password must be between 8 and 128 characters.' });
    }

    const result = await registerUser({ name: cleanName, email: cleanEmail, password });
    const user = await User.findById(result.id).select('-passwordHash');

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: result.token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const token = await loginUser({ email: cleanEmail, password });
    const user = await User.findOne({ email: cleanEmail }).select('-passwordHash');

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/profile', authMiddleware, (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (name) user.name = String(name).trim();
    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin-only', authMiddleware, requireRole('admin'), (req, res) => {
  return res.json({ success: true, message: 'Admin area accessed' });
});

module.exports = router;
