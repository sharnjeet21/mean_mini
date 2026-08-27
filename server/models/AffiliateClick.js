'use strict';

const mongoose = require('mongoose');

const AffiliateClickSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    provider: {
      type: String,
      required: true,
      enum: ['booking.com', 'agoda', 'skyscanner', 'expedia', 'other'],
    },
    targetType: {
      type: String,
      required: true,
      enum: ['hotel', 'flight', 'activity', 'insurance'],
    },
    targetId: { type: String },
    targetName: { type: String },
    destination: { type: String },
    sourceUrl: { type: String },
    ipAddress: {
      type: String,
      select: false, // Excluded from normal queries
    },
    userAgent: { type: String },
    clickedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

AffiliateClickSchema.index({ provider: 1, clickedAt: -1 });
AffiliateClickSchema.index({ destination: 1 });
AffiliateClickSchema.index({ user: 1, clickedAt: -1 });

module.exports = mongoose.model('AffiliateClick', AffiliateClickSchema);
