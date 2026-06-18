const mongoose = require("mongoose");

const itinerarySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  destination: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  duration: {
    type: String,
    required: true, // e.g., "4 Days / 3 Nights"
  },
  budget: {
    type: Number,
    required: true,
    min: 0,
  },
  travelerCount: {
    type: Number,
    min: 1,
    max: 50,
    default: 1,
  },
  category: {
    type: String,
    enum: ['adventure', 'cultural', 'leisure', 'business', 'wellness', 'family', 'other'],
    default: 'leisure',
  },
  travelStyle: {
    type: String,
    enum: ['budget', 'balanced', 'premium'],
    default: 'balanced',
  },
  transportMode: {
    type: String,
    enum: ['walk', 'bicycle', 'public_transport', 'train', 'car', 'flight', 'mixed'],
    default: 'mixed',
  },
  accommodationType: {
    type: String,
    enum: ['eco_lodge', 'homestay', 'hostel', 'hotel', 'resort', 'other'],
    default: 'hotel',
  },
  budgetBreakdown: {
    transport: { type: Number, min: 0, default: 0 },
    accommodation: { type: Number, min: 0, default: 0 },
    food: { type: Number, min: 0, default: 0 },
    activities: { type: Number, min: 0, default: 0 },
    contingency: { type: Number, min: 0, default: 0 },
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  dailyPlan: [{
    day: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    activities: [{
      time: String,
      activity: String,
      description: String,
      location: String,
    }],
  }],
  tripSummary: {
    totalDistance: String,
    travelTime: String,
    mealsIncluded: [String],
    highlights: [String],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  bookings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    bookedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
  }],
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

itinerarySchema.index({ destination: 1, isActive: 1 });
itinerarySchema.index({ createdBy: 1, createdAt: -1 });
itinerarySchema.index({ 'bookings.userId': 1 });
itinerarySchema.index({ favorites: 1 });

module.exports = mongoose.model("Itinerary", itinerarySchema);
