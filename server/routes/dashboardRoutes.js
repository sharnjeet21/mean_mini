'use strict';

const express = require('express');
const { getDashboardStats, getAgencyAnalytics } = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// General platform stats (public — used by admin/landing widgets)
router.get('/stats', (req, res, next) => getDashboardStats(req, res, next));

// Agency-level analytics for trip-managers and above
router.get(
  '/agency-analytics',
  authenticate,
  authorize('trip-manager', 'admin', 'superadmin'),
  (req, res, next) => getAgencyAnalytics(req, res, next),
);

module.exports = router;
