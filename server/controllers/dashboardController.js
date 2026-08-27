'use strict';

const User = require('../models/User');
const Itinerary = require('../models/Itinerary');

async function getDashboardStats(req, res, next) {
  try {
    const [users, itineraries] = await Promise.all([
      User.countDocuments(),
      Itinerary.countDocuments(),
    ]);

    const topDestinations = await Itinerary.aggregate([
      { $group: { _id: '$destination', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      totalUsers: users,
      totalItineraries: itineraries,
      topDestinations: topDestinations.map((item) => ({ name: item._id, count: item.count })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Agency-level analytics for trip-managers and above.
 * Scoped to the requesting user's own itineraries for trip-managers,
 * platform-wide for admins/superadmins.
 */
async function getAgencyAnalytics(req, res, next) {
  try {
    const role = req.user.role;
    const isAdmin = ['admin', 'superadmin'].includes(role);

    const matchStage = isAdmin ? {} : { createdBy: req.user._id };

    const [summary] = await Itinerary.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          activeProposals: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          draftCount: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          totalBudget: { $sum: { $ifNull: ['$budget', 0] } },
          totalBookings: { $sum: { $size: { $ifNull: ['$bookings', []] } } },
        },
      },
    ]);

    // Unique client count = distinct users who booked any of these itineraries
    const clientPipeline = [
      { $match: matchStage },
      { $unwind: { path: '$bookings', preserveNullAndEmptyArrays: false } },
      { $match: { 'bookings.status': { $ne: 'cancelled' } } },
      { $group: { _id: '$bookings.userId' } },
      { $count: 'totalClients' },
    ];
    const [clientResult] = await Itinerary.aggregate(clientPipeline);

    const topDestinations = await Itinerary.aggregate([
      { $match: matchStage },
      { $group: { _id: '$destination', trips: { $sum: 1 } } },
      { $sort: { trips: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, destination: '$_id', trips: 1 } },
    ]);

    return res.json({
      totalTrips: summary?.totalTrips || 0,
      activeProposals: summary?.activeProposals || 0,
      draftCount: summary?.draftCount || 0,
      totalBudget: summary?.totalBudget || 0,
      totalBookings: summary?.totalBookings || 0,
      totalClients: clientResult?.totalClients || 0,
      topDestinations,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardStats, getAgencyAnalytics };
