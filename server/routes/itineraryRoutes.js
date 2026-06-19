const express = require('express');
const mongoose = require('mongoose');
const Itinerary = require('../models/Itinerary');
const { authenticate, authorize } = require('../middleware/auth');
const { analyzeTrip } = require('../utils/tripAnalyzer');

const router = express.Router();

const EDITABLE_FIELDS = [
  'title',
  'destination',
  'startDate',
  'endDate',
  'duration',
  'budget',
  'travelerCount',
  'category',
  'travelStyle',
  'transportMode',
  'accommodationType',
  'budgetBreakdown',
  'description',
  'dailyPlan',
  'tripSummary',
  'isActive',
];

function pickItineraryFields(body) {
  return EDITABLE_FIELDS.reduce((payload, field) => {
    if (body[field] !== undefined) payload[field] = body[field];
    return payload;
  }, {});
}

function validateItinerary(payload, requireAll = false) {
  const required = ['title', 'destination', 'startDate', 'endDate', 'duration', 'budget'];
  if (requireAll && required.some((field) => payload[field] === undefined || payload[field] === '')) {
    return 'Please fill all required fields.';
  }

  if (payload.startDate && payload.endDate && new Date(payload.endDate) < new Date(payload.startDate)) {
    return 'End date must be on or after the start date.';
  }
  if (payload.budget !== undefined && (!Number.isFinite(Number(payload.budget)) || Number(payload.budget) < 0)) {
    return 'Budget must be a valid non-negative number.';
  }
  if (payload.travelerCount !== undefined && (!Number.isInteger(Number(payload.travelerCount)) || Number(payload.travelerCount) < 1)) {
    return 'Traveler count must be a positive whole number.';
  }
  return null;
}

function canManageItinerary(user) {
  return ['admin', 'superadmin'].includes(user.role);
}

function getEngagement(itinerary, userId) {
  const reviews = itinerary.reviews || [];
  const ratingCount = reviews.length;
  const averageRating = ratingCount
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / ratingCount
    : 0;

  return {
    bookingCount: itinerary.bookings?.filter((booking) => booking.status !== 'cancelled').length || 0,
    favoriteCount: itinerary.favorites?.length || 0,
    ratingCount,
    averageRating: Number(averageRating.toFixed(1)),
    isFavorite: Boolean(userId && itinerary.favorites?.some((id) => id.toString() === userId.toString())),
    hasBooked: Boolean(userId && itinerary.bookings?.some((booking) => booking.status !== 'cancelled' && (
      booking.userId?._id?.toString() === userId.toString()
      || booking.userId?.toString() === userId.toString()
    ))),
  };
}

function presentItinerary(document, userId, options = {}) {
  const object = typeof document.toObject === 'function' ? document.toObject() : document;
  const presented = {
    ...object,
    engagement: getEngagement(object, userId),
  };
  delete presented.favorites;
  if (!options.includeBookings) delete presented.bookings;
  if (!options.includeReviews) delete presented.reviews;
  return presented;
}

function ensureValidId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid itinerary identifier.' });
  }
  return next();
}

// Get the signed-in user's bookings.
router.get('/user/bookings', authenticate, async (req, res) => {
  try {
    const itineraries = await Itinerary.find({
      bookings: { $elemMatch: { userId: req.user._id, status: { $ne: 'cancelled' } } },
    })
      .populate('createdBy', 'name email role')
      .sort({ 'bookings.bookedAt': -1 });

    const bookings = itineraries.map((itinerary) => {
      const userBooking = itinerary.bookings.find((booking) => (
        (booking.userId?._id || booking.userId).toString() === req.user._id.toString()
        && booking.status !== 'cancelled'
      ));
      return { ...presentItinerary(itinerary, req.user._id), userBooking };
    });

    return res.json(bookings);
  } catch (error) {
    console.error('Fetch user bookings error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Get the signed-in user's saved itineraries.
router.get('/user/favorites', authenticate, async (req, res) => {
  try {
    const itineraries = await Itinerary.find({
      favorites: req.user._id,
      isActive: true,
    })
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json(itineraries.map((item) => presentItinerary(item, req.user._id)));
  } catch (error) {
    console.error('Fetch favorites error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Portfolio-level metrics for the administration dashboard.
router.get('/analytics/overview', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const [summary] = await Itinerary.aggregate([
      {
        $group: {
          _id: null,
          totalItineraries: { $sum: 1 },
          activeItineraries: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalBookings: { $sum: { $size: { $ifNull: ['$bookings', []] } } },
          totalFavorites: { $sum: { $size: { $ifNull: ['$favorites', []] } } },
          totalReviews: { $sum: { $size: { $ifNull: ['$reviews', []] } } },
          averageBudget: { $avg: '$budget' },
        },
      },
    ]);

    const topDestinations = await Itinerary.aggregate([
      {
        $project: {
          destination: 1,
          engagement: {
            $add: [
              { $size: { $ifNull: ['$bookings', []] } },
              { $size: { $ifNull: ['$favorites', []] } },
              { $size: { $ifNull: ['$reviews', []] } },
            ],
          },
        },
      },
      { $group: { _id: '$destination', trips: { $sum: 1 }, engagement: { $sum: '$engagement' } } },
      { $sort: { engagement: -1, trips: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, destination: '$_id', trips: 1, engagement: 1 } },
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
  } catch (error) {
    console.error('Itinerary analytics error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Trip managers can publish itineraries.
router.post('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const payload = pickItineraryFields(req.body);
    const validationError = validateItinerary(payload, true);
    if (validationError) return res.status(400).json({ message: validationError });

    const itinerary = await Itinerary.create({
      ...payload,
      createdBy: req.user._id,
    });

    await itinerary.populate('createdBy', 'name email role');
    return res.status(201).json(presentItinerary(itinerary, req.user._id));
  } catch (error) {
    console.error('Create itinerary error:', error.message);
    return res.status(error.name === 'ValidationError' ? 400 : 500).json({
      message: error.name === 'ValidationError' ? error.message : 'Server error.',
    });
  }
});

// Browse active itineraries; administrators can also see inactive records.
router.get('/', authenticate, async (req, res) => {
  try {
    const query = ['admin', 'superadmin'].includes(req.user.role) ? {} : { isActive: true };
    const itineraries = await Itinerary.find(query)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json(itineraries.map((item) => presentItinerary(item, req.user._id)));
  } catch (error) {
    console.error('Fetch itineraries error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Deterministic multi-criteria analysis for a single trip.
router.get('/:id/analysis', authenticate, ensureValidId, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id).lean();
    if (!itinerary || (!itinerary.isActive && req.user.role === 'user')) {
      return res.status(404).json({ message: 'Itinerary not found.' });
    }
    return res.json(analyzeTrip(itinerary));
  } catch (error) {
    console.error('Analyze itinerary error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Toggle wishlist state.
router.post('/:id/favorite', authenticate, ensureValidId, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !itinerary.isActive) return res.status(404).json({ message: 'Itinerary not available.' });

    const index = itinerary.favorites.findIndex((id) => id.toString() === req.user._id.toString());
    const isFavorite = index === -1;
    if (isFavorite) itinerary.favorites.push(req.user._id);
    else itinerary.favorites.splice(index, 1);
    await itinerary.save();

    return res.json({
      message: isFavorite ? 'Itinerary saved to your wishlist.' : 'Itinerary removed from your wishlist.',
      isFavorite,
      favoriteCount: itinerary.favorites.length,
    });
  } catch (error) {
    console.error('Favorite itinerary error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Create or update the user's review.
router.post('/:id/reviews', authenticate, ensureValidId, async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be a whole number between 1 and 5.' });
    }
    if (comment.length > 500) return res.status(400).json({ message: 'Review must be 500 characters or fewer.' });

    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !itinerary.isActive) return res.status(404).json({ message: 'Itinerary not available.' });

    const existing = itinerary.reviews.find((review) => review.userId.toString() === req.user._id.toString());
    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
      existing.updatedAt = new Date();
    } else {
      itinerary.reviews.push({ userId: req.user._id, rating, comment });
    }
    await itinerary.save();
    await itinerary.populate('reviews.userId', 'name');

    return res.status(existing ? 200 : 201).json({
      message: existing ? 'Review updated.' : 'Review submitted.',
      reviews: itinerary.reviews,
      engagement: getEngagement(itinerary, req.user._id),
    });
  } catch (error) {
    console.error('Review itinerary error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Book an itinerary.
router.post('/:id/book', authenticate, ensureValidId, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !itinerary.isActive) return res.status(404).json({ message: 'Itinerary not available.' });

    const existingBooking = itinerary.bookings.find(
      (booking) => booking.userId.toString() === req.user._id.toString() && booking.status !== 'cancelled'
    );
    if (existingBooking) return res.status(400).json({ message: 'You already have an active booking for this itinerary.' });

    const cancelledBooking = itinerary.bookings.find(
      (booking) => booking.userId.toString() === req.user._id.toString() && booking.status === 'cancelled'
    );
    if (cancelledBooking) {
      cancelledBooking.status = 'pending';
      cancelledBooking.bookedAt = new Date();
    } else {
      itinerary.bookings.push({ userId: req.user._id, status: 'pending' });
    }
    await itinerary.save();

    return res.status(201).json({
      message: 'Booking request submitted.',
      booking: cancelledBooking || itinerary.bookings[itinerary.bookings.length - 1],
      bookingCount: itinerary.bookings.filter((booking) => booking.status !== 'cancelled').length,
    });
  } catch (error) {
    console.error('Book itinerary error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Cancel the signed-in user's booking.
router.delete('/:id/book', authenticate, ensureValidId, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found.' });
    const booking = itinerary.bookings.find((item) => item.userId.toString() === req.user._id.toString());
    if (!booking || booking.status === 'cancelled') return res.status(404).json({ message: 'Active booking not found.' });

    booking.status = 'cancelled';
    await itinerary.save();
    return res.json({ message: 'Booking cancelled.', booking });
  } catch (error) {
    console.error('Cancel booking error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Administrators can progress a booking through its workflow.
router.patch('/:id/bookings/:bookingId/status', authenticate, authorize('admin', 'superadmin'), ensureValidId, async (req, res) => {
  try {
    const status = String(req.body.status || '');
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid booking status.' });
    }
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found.' });
    const booking = itinerary.bookings.id(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    booking.status = status;
    await itinerary.save();
    return res.json({ message: 'Booking status updated.', booking });
  } catch (error) {
    console.error('Update booking error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Get a detailed itinerary.
router.get('/:id', authenticate, ensureValidId, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('bookings.userId', 'name email')
      .populate('reviews.userId', 'name');

    if (!itinerary || (req.user.role === 'user' && !itinerary.isActive)) {
      return res.status(404).json({ message: 'Itinerary not found.' });
    }
    return res.json(presentItinerary(itinerary, req.user._id, {
      includeReviews: true,
      includeBookings: ['admin', 'superadmin'].includes(req.user.role),
    }));
  } catch (error) {
    console.error('Fetch itinerary error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Trip managers can edit any itinerary.
router.put('/:id', authenticate, ensureValidId, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found.' });
    if (!canManageItinerary(req.user)) return res.status(403).json({ message: 'Insufficient permissions.' });

    const payload = pickItineraryFields(req.body);
    if (req.user.role === 'user') delete payload.isActive;
    const validationError = validateItinerary({
      ...itinerary.toObject(),
      ...payload,
    });
    if (validationError) return res.status(400).json({ message: validationError });

    Object.assign(itinerary, payload);
    await itinerary.save();
    await itinerary.populate('createdBy', 'name email role');
    return res.json(presentItinerary(itinerary, req.user._id));
  } catch (error) {
    console.error('Update itinerary error:', error.message);
    return res.status(error.name === 'ValidationError' ? 400 : 500).json({
      message: error.name === 'ValidationError' ? error.message : 'Server error.',
    });
  }
});

// Trip managers can remove any itinerary.
router.delete('/:id', authenticate, ensureValidId, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found.' });
    if (!canManageItinerary(req.user)) return res.status(403).json({ message: 'Insufficient permissions.' });

    await itinerary.deleteOne();
    return res.json({ message: 'Itinerary deleted.' });
  } catch (error) {
    console.error('Delete itinerary error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
