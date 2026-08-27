'use strict';

/**
 * billingService
 *
 * Provides organization-tier billing checks and usage tracking.
 * Organization membership is optional — users without an org have no hard limits.
 */

const Organization = require('../models/Organization');

const TIER_LIMITS = {
  free: {
    itinerariesPerMonth: 10,
    features: ['basic_ai', 'public_share'],
  },
  professional: {
    itinerariesPerMonth: 50,
    features: ['basic_ai', 'public_share', 'client_profiles', 'budget_reports'],
  },
  agency: {
    itinerariesPerMonth: Infinity,
    features: [
      'basic_ai',
      'public_share',
      'client_profiles',
      'budget_reports',
      'destination_analytics',
      'affiliate_tracking',
    ],
  },
};

/**
 * Returns true if the user/org can create another itinerary.
 * Users without an organizationId bypass org-level limits entirely.
 */
async function canCreateItinerary(organizationId) {
  if (!organizationId) return true;

  const org = await Organization.findById(organizationId).lean();
  if (!org) throw new Error('Organization not found');

  const tier = org.subscription?.tier || 'free';
  const limit = TIER_LIMITS[tier]?.itinerariesPerMonth ?? 10;

  if (limit === Infinity) return true;

  // Count itineraries created by org members this calendar month
  const Itinerary = require('../models/Itinerary');
  const memberIds = [org.owner, ...org.members.map((m) => m.user)];
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await Itinerary.countDocuments({
    createdBy: { $in: memberIds },
    createdAt: { $gte: startOfMonth },
  });

  return count < limit;
}

/**
 * Returns the feature list for a given org tier.
 */
function getTierFeatures(tier) {
  return TIER_LIMITS[tier]?.features || TIER_LIMITS.free.features;
}

/**
 * Returns the full tier limits map (useful for UI display).
 */
function getTierLimits() {
  return TIER_LIMITS;
}

/**
 * Log a usage event. Extensible for future Stripe/analytics integration.
 */
async function trackUsage(organizationId, usageType, metadata = {}) {
  if (!organizationId) return;
  console.log(`[billingService] org=${organizationId} type=${usageType}`, metadata);
}

module.exports = {
  canCreateItinerary,
  getTierFeatures,
  getTierLimits,
  trackUsage,
};
