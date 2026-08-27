'use strict';

const express = require('express');
const AffiliateClick = require('../models/AffiliateClick');
const { optionalAuth } = require('../middleware/auth');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const VALID_PROVIDERS = ['booking.com', 'agoda', 'skyscanner', 'expedia', 'other'];
const VALID_TYPES = ['hotel', 'flight', 'activity', 'insurance'];

/**
 * GET /api/v1/affiliates/redirect
 * Track an affiliate click and redirect to the partner URL.
 * Auth is optional — guests are tracked without a userId.
 */
router.get('/redirect', optionalAuth, async (req, res) => {
  const { provider, type, id, name, dest, url } = req.query;

  if (!provider || !type || !url) {
    return res.status(400).json({ message: 'provider, type, and url are required.' });
  }

  const normalizedProvider = String(provider).toLowerCase();
  const normalizedType = String(type).toLowerCase();

  if (!VALID_PROVIDERS.includes(normalizedProvider)) {
    return res.status(400).json({ message: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}.` });
  }
  if (!VALID_TYPES.includes(normalizedType)) {
    return res.status(400).json({ message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}.` });
  }

  // Validate destination URL to only allow http/https
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ message: 'Only http and https URLs are permitted.' });
    }
  } catch {
    return res.status(400).json({ message: 'Invalid redirect URL.' });
  }

  // Track the click — fail silently so UX is never broken by tracking errors
  try {
    await AffiliateClick.create({
      user: req.user ? req.user._id : null,
      provider: normalizedProvider,
      targetType: normalizedType,
      targetId: id || undefined,
      targetName: name || undefined,
      destination: dest || undefined,
      sourceUrl: req.get('Referrer') || '',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } catch (err) {
    console.error('[affiliateRoutes] Click tracking error:', err.message);
  }

  return res.redirect(String(url));
});

/**
 * GET /api/v1/affiliates/analytics
 * Returns affiliate click analytics. Admin/superadmin only.
 */
router.get('/analytics', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const [byProvider, byType, recentClicks, total] = await Promise.all([
      AffiliateClick.aggregate([
        { $group: { _id: '$provider', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, provider: '$_id', count: 1 } },
      ]),
      AffiliateClick.aggregate([
        { $group: { _id: '$targetType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, type: '$_id', count: 1 } },
      ]),
      AffiliateClick.find()
        .sort({ clickedAt: -1 })
        .limit(10)
        .select('provider targetType targetName destination clickedAt')
        .lean(),
      AffiliateClick.countDocuments(),
    ]);

    return res.json({ total, byProvider, byType, recentClicks });
  } catch (err) {
    console.error('[affiliateRoutes] Analytics error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
