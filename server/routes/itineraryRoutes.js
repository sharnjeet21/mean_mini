const express = require('express');
const mongoose = require('mongoose');
const Itinerary = require('../models/Itinerary');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
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
  'imageUrl',
  'stops',
  'dailyPlan',
  'tripSummary',
  'isActive',
  'status',
];

function pickItineraryFields(body) {
  return EDITABLE_FIELDS.reduce((payload, field) => {
    if (body[field] !== undefined) payload[field] = body[field];
    return payload;
  }, {});
}

function validateItinerary(payload, requireAll = false) {
  const isDraft = payload.status === 'draft';
  const required = isDraft 
    ? ['title', 'destination']
    : ['title', 'destination', 'startDate', 'endDate', 'duration', 'budget'];
    
  if (requireAll && required.some((field) => payload[field] === undefined || payload[field] === '')) {
    return 'Please fill all required fields.';
  }

  if (payload.startDate && payload.endDate && new Date(payload.endDate) < new Date(payload.startDate)) {
    return 'End date must be on or after the start date.';
  }
  if (payload.budget !== undefined && payload.budget !== null && (!Number.isFinite(Number(payload.budget)) || Number(payload.budget) < 0)) {
    return 'Budget must be a valid non-negative number.';
  }
  if (payload.travelerCount !== undefined && payload.travelerCount !== null && (!Number.isInteger(Number(payload.travelerCount)) || Number(payload.travelerCount) < 1)) {
    return 'Traveler count must be a positive whole number.';
  }

  if (payload.dailyPlan) {
    if (!Array.isArray(payload.dailyPlan)) {
      return 'Daily plan must be an array.';
    }

    const daysCount = payload.dailyPlan.length;
    if (daysCount > 0) {
      const expectedDuration = `${daysCount} day${daysCount > 1 ? 's' : ''}`;
      // Basic check, allows "21 Days" or "21 day"
      if (payload.duration && parseInt(payload.duration, 10) !== daysCount) {
        return `Duration must match the daily plan length (${daysCount} days).`;
      }
    }

    for (let i = 0; i < payload.dailyPlan.length; i++) {
      const day = payload.dailyPlan[i];
      if (day.day === undefined || day.day === null || !Number.isInteger(Number(day.day)) || Number(day.day) <= 0) {
        return `Day at index ${i} must have a valid positive day number.`;
      }
      if (!day.title || typeof day.title !== 'string' || day.title.trim() === '') {
        return `Day ${day.day || (i + 1)} must have a non-empty title.`;
      }
      if (day.activities) {
        if (!Array.isArray(day.activities)) {
          return `Activities for Day ${day.day || (i + 1)} must be an array.`;
        }
        if (day.activities.length < 2) {
          return `Day ${day.day || (i + 1)} must have at least 2 activities.`;
        }
        for (let j = 0; j < day.activities.length; j++) {
          const act = day.activities[j];
          if (!act || typeof act !== 'object') {
            return `Activity at index ${j} on Day ${day.day || (i + 1)} is malformed.`;
          }
          if (!act.activity || typeof act.activity !== 'string' || act.activity.trim() === '') {
            return `Activity ${j + 1} on Day ${day.day || (i + 1)} must have a name.`;
          }
        }
      } else {
        return `Day ${day.day || (i + 1)} must have at least 2 activities.`;
      }
    }
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

// Get signed-in creator's own itineraries.
router.get('/my', authenticate, async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ createdBy: req.user._id })
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });
    return res.json(itineraries.map((item) => presentItinerary(item, req.user._id)));
  } catch (error) {
    console.error('Fetch my itineraries error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Get itineraries managed by operations (Admins/Superadmins)
router.get('/managed', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const itineraries = await Itinerary.find()
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });
    return res.json(itineraries.map((item) => presentItinerary(item, req.user._id)));
  } catch (error) {
    console.error('Fetch managed itineraries error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Get global platform itineraries (Superadmins only)
router.get('/platform', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const itineraries = await Itinerary.find()
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });
    return res.json(itineraries.map((item) => presentItinerary(item, req.user._id)));
  } catch (error) {
    console.error('Fetch platform itineraries error:', error.message);
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

// Trip managers, Admins and Superadmins can create itineraries. Normal travelers cannot.
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'user') {
      return res.status(403).json({ message: 'Insufficient permissions. Travelers cannot create itineraries.' });
    }
    const payload = pickItineraryFields(req.body);
    const canPublish = ['admin', 'superadmin', 'trip-manager'].includes(req.user.role);

    const validationError = validateItinerary(payload, true);
    if (validationError) return res.status(400).json({ message: validationError });

    let imageUrl = payload.imageUrl;
    if (!imageUrl && payload.destination) {
      try {
        const { enrichWithImage } = require('../services/imageService');
        const imageData = await enrichWithImage(payload.destination);
        if (imageData && imageData.image) {
          imageUrl = imageData.image;
        }
      } catch (err) {
        console.error('Failed to resolve image during creation:', err.message);
      }
    }

    const itinerary = await Itinerary.create({
      ...payload,
      imageUrl,
      stops: Array.isArray(payload.stops)
        ? payload.stops
          .filter((stop) => stop?.name?.trim())
          .map((stop, index) => ({ name: stop.name.trim(), notes: stop.notes || '', order: index }))
        : [],
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

// Browse public active itineraries (active and published only, or own drafts)
router.get('/', authenticate, async (req, res) => {
  try {
    const { budgetMin, budgetMax, duration, category, style, sort, destination, page, limit } = req.query;

    const query = {
      isActive: true,
      $or: [
        { status: 'published' },
        { status: { $exists: false } },
        { status: 'draft', createdBy: req.user._id }
      ]
    };

    if (budgetMin !== undefined || budgetMax !== undefined) {
      query.budget = {};
      if (budgetMin !== undefined && budgetMin !== '') query.budget.$gte = Number(budgetMin);
      if (budgetMax !== undefined && budgetMax !== '') query.budget.$lte = Number(budgetMax);
      if (Object.keys(query.budget).length === 0) delete query.budget;
    }

    if (duration) query.duration = duration;
    if (category) query.category = category;
    if (style) query.travelStyle = style;
    if (destination) query.destination = { $regex: destination, $options: 'i' };

    let sortOption = { createdAt: -1 };
    if (sort === 'budget_asc') sortOption = { budget: 1, createdAt: -1 };
    if (sort === 'budget_desc') sortOption = { budget: -1, createdAt: -1 };
    if (sort === 'duration_asc') sortOption = { duration: 1, createdAt: -1 };
    if (sort === 'duration_desc') sortOption = { duration: -1, createdAt: -1 };

    const pageNum = page ? parseInt(page, 10) : null;
    const limitNum = limit ? parseInt(limit, 10) : null;

    if (pageNum !== null || limitNum !== null) {
      const p = pageNum || 1;
      const l = limitNum || 6;
      const skip = (p - 1) * l;

      const total = await Itinerary.countDocuments(query);
      const itineraries = await Itinerary.find(query)
        .populate('createdBy', 'name email role')
        .sort(sortOption)
        .skip(skip)
        .limit(l);

      const data = itineraries.map((item) => presentItinerary(item, req.user._id));
      const hasMore = total > (skip + data.length);

      return res.json({
        data,
        total,
        page: p,
        limit: l,
        hasMore
      });
    } else {
      const itineraries = await Itinerary.find(query)
        .populate('createdBy', 'name email role')
        .sort(sortOption);
      return res.json(itineraries.map((item) => presentItinerary(item, req.user._id)));
    }
  } catch (error) {
    console.error('Fetch itineraries error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Public shareable itinerary — no authentication required.
// Returns only fields appropriate for public exposure (no bookings, no favorites list).
router.get('/:id/public', optionalAuth, ensureValidId, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id)
      .populate('createdBy', 'name')
      .lean();

    if (!itinerary || !itinerary.isActive || (itinerary.status && itinerary.status !== 'published')) {
      return res.status(404).json({ message: 'Itinerary not found or not publicly available.' });
    }

    const reviews = itinerary.reviews || [];
    const ratingCount = reviews.length;
    const averageRating = ratingCount
      ? Number((reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / ratingCount).toFixed(1))
      : 0;

    const publicData = {
      _id: itinerary._id,
      title: itinerary.title,
      destination: itinerary.destination,
      duration: itinerary.duration,
      budget: itinerary.budget,
      travelerCount: itinerary.travelerCount,
      travelStyle: itinerary.travelStyle,
      transportMode: itinerary.transportMode,
      category: itinerary.category,
      description: itinerary.description,
      imageUrl: itinerary.imageUrl,
      dailyPlan: itinerary.dailyPlan,
      tripSummary: itinerary.tripSummary,
      createdBy: itinerary.createdBy,
      createdAt: itinerary.createdAt,
      engagement: {
        ratingCount,
        averageRating,
        favoriteCount: (itinerary.favorites || []).length,
        bookingCount: (itinerary.bookings || []).filter((b) => b.status !== 'cancelled').length,
      },
    };

    return res.json(publicData);
  } catch (error) {
    console.error('Public itinerary error:', error.message);
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

    const isOwner = itinerary && itinerary.createdBy && itinerary.createdBy._id.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!itinerary || (!isAdmin && !itinerary.isActive) || (itinerary.status === 'draft' && !isOwner && !isAdmin)) {
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

// Trip managers can edit any itinerary; users can edit their own drafts.
router.put('/:id', authenticate, ensureValidId, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return res.status(404).json({ message: 'Itinerary not found.' });
    
    // 1. Authorization checks
    const isOwner = itinerary.createdBy && itinerary.createdBy.toString() === req.user._id.toString();
    const isSuperadmin = req.user.role === 'superadmin';
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (req.user.role === 'user') {
      return res.status(403).json({ message: 'Insufficient permissions. Travelers cannot edit itineraries.' });
    }

    if (!isSuperadmin && !isOwner) {
      return res.status(403).json({ message: 'Insufficient permissions. You can only edit your own itineraries.' });
    }

    // 2. Concurrency Check
    const clientUpdatedAt = req.body.updatedAt;
    const clientVersion = req.body.__v;
    if (clientUpdatedAt && itinerary.updatedAt) {
      if (new Date(clientUpdatedAt).getTime() !== new Date(itinerary.updatedAt).getTime()) {
        return res.status(409).json({ message: 'The itinerary has been modified by another process. Please reload and try again.' });
      }
    }
    if (clientVersion !== undefined && itinerary.__v !== undefined) {
      if (Number(clientVersion) !== Number(itinerary.__v)) {
        return res.status(409).json({ message: 'The itinerary has been modified by another process. Please reload and try again.' });
      }
    }

    const payload = pickItineraryFields(req.body);
    
    // Normal travelers & trip managers cannot edit other users' active state
    if (!isAdmin) {
      delete payload.isActive;
    }

    const currentStatus = itinerary.status || 'draft';
    const newStatus = payload.status;
    if (newStatus && newStatus !== currentStatus) {
      if (req.user.role === 'user') {
        return res.status(403).json({ message: 'Travelers cannot modify itinerary publish state.' });
      }
      if (currentStatus === 'archived' && newStatus !== 'published') {
        return res.status(400).json({ message: 'Archived itineraries can only be republished.' });
      }
      if (currentStatus === 'draft' && newStatus === 'archived') {
        return res.status(400).json({ message: 'Draft itineraries cannot be directly archived.' });
      }
    }
    
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
    
    const isOwner = itinerary.createdBy && itinerary.createdBy.toString() === req.user._id.toString();
    const isSuperadmin = req.user.role === 'superadmin';

    if (req.user.role === 'user') {
      return res.status(403).json({ message: 'Insufficient permissions. Travelers cannot delete itineraries.' });
    }

    if (!isSuperadmin && !isOwner) {
      return res.status(403).json({ message: 'Insufficient permissions. You can only delete your own itineraries.' });
    }

    if (itinerary.status === 'published' && !isSuperadmin) {
      return res.status(400).json({ message: 'Published itineraries must be archived before deletion.' });
    }

    await itinerary.deleteOne();
    return res.json({ message: 'Itinerary deleted.' });
  } catch (error) {
    console.error('Delete itinerary error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
