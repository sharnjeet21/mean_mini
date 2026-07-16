const express = require('express');
const router = express.Router();
const AffiliateClick = require('../models/AffiliateClick');
const { authenticateOptional } = require('../middleware/auth'); // assuming optional auth exists, else we can skip
// wait, I will just use basic middleware or skip

// A middleware to optionally get user if token exists
const jwt = require("jsonwebtoken");
const authenticateOptionalBasic = (req, res, next) => {
  const token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
    req.user = decoded;
  } catch (err) {}
  next();
};

/**
 * GET /api/v1/affiliates/redirect
 * Track click and redirect to partner
 */
router.get("/redirect", authenticateOptionalBasic, async (req, res) => {
  try {
    const { provider, type, id, name, dest, url } = req.query;

    if (!provider || !type || !url) {
      return res.status(400).send("Missing required parameters for redirection.");
    }

    // Log the click
    await AffiliateClick.create({
      user: req.user ? req.user.id : null,
      provider: provider,
      targetType: type,
      targetId: id,
      targetName: name,
      destination: dest,
      sourceUrl: req.get('Referrer') || '',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Redirect to the actual partner URL
    res.redirect(url);
  } catch (err) {
    console.error("Affiliate redirect error:", err);
    // Even if tracking fails, we should still try to redirect the user to not break UX
    if (req.query.url) {
      res.redirect(req.query.url);
    } else {
      res.status(500).send("Server error during redirection.");
    }
  }
});

module.exports = router;
