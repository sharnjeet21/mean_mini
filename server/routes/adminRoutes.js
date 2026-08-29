const express = require('express');
const { listUsers, deleteUser } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin', 'superadmin'));

router.get('/users', (req, res, next) => listUsers(req, res, next));
router.delete('/users/:id', (req, res, next) => deleteUser(req, res, next));

// Admin analytics — delegates to the detailed itinerary analytics endpoint
// (itineraryRoutes /analytics/overview is mounted at /api/v1/itinerary/analytics/overview)
// We proxy internally to share the same aggregation logic
const Itinerary = require('../models/Itinerary');
router.get('/analytics', async (req, res, next) => {
  try {
    const [summary] = await Itinerary.aggregate([{
      $group: {
        _id: null,
        totalItineraries: { $sum: 1 },
        activeItineraries: { $sum: { $cond: ['$isActive', 1, 0] } },
        totalBookings: { $sum: { $size: { $ifNull: ['$bookings', []] } } },
        totalFavorites: { $sum: { $size: { $ifNull: ['$favorites', []] } } },
        totalReviews: { $sum: { $size: { $ifNull: ['$reviews', []] } } },
        averageBudget: { $avg: '$budget' },
      },
    }]);
    const topDestinations = await Itinerary.aggregate([
      { $group: { _id: '$destination', trips: { $sum: 1 } } },
      { $sort: { trips: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, destination: '$_id', trips: 1 } },
    ]);
    const bookingStatus = await Itinerary.aggregate([
      { $unwind: { path: '$bookings', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$bookings.status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ]);
    return res.json({
      summary: {
        totalItineraries: summary?.totalItineraries || 0,
        activeItineraries: summary?.activeItineraries || 0,
        inactiveItineraries: (summary?.totalItineraries || 0) - (summary?.activeItineraries || 0),
        totalBookings: summary?.totalBookings || 0,
        totalFavorites: summary?.totalFavorites || 0,
        totalReviews: summary?.totalReviews || 0,
        averageBudget: Math.round(summary?.averageBudget || 0),
      },
      topDestinations,
      bookingStatus,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;