const User = require("../models/User");
const Itinerary = require("../models/Itinerary");

async function getDashboardStats(req, res, next) {
  try {
    const [users, itineraries] = await Promise.all([
      User.countDocuments(),
      Itinerary.countDocuments(),
    ]);

    const topDestinations = await Itinerary.aggregate([
      { $group: { _id: "$destination", count: { $sum: 1 } } },
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

module.exports = { getDashboardStats };