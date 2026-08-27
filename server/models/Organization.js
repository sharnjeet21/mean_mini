'use strict';

const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['admin', 'planner', 'viewer'],
          default: 'planner',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    branding: {
      logoUrl: String,
      primaryColor: String,
      website: String,
    },
    subscription: {
      tier: {
        type: String,
        enum: ['free', 'professional', 'agency'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'past_due', 'canceled'],
        default: 'active',
      },
    },
  },
  { timestamps: true },
);

OrganizationSchema.index({ owner: 1 });
OrganizationSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Organization', OrganizationSchema);
