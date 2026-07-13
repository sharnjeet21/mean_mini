'use strict';

const Organization = require('../models/Organization');

const TIER_LIMITS = {
  free: {
    itinerariesPerMonth: 10,
    features: ['basic_ai', 'public_share']
  },
  pro: {
    itinerariesPerMonth: 50,
    features: ['basic_ai', 'public_share', 'client_profiles', 'budget_reports']
  },
  agency: {
    itinerariesPerMonth: Infinity,
    features: ['basic_ai', 'public_share', 'client_profiles', 'budget_reports', 'destination_analytics']
  }
};

/**
 * Validates if the organization can create another itinerary this month based on their tier.
 */
async function canCreateItinerary(organizationId) {
  if (!organizationId) return true; // Individual users have no hard limit for now
  
  const org = await Organization.findById(organizationId);
  if (!org) throw new Error('Organization not found');

  const tier = org.settings?.subscriptionTier || 'free';
  const limit = TIER_LIMITS[tier].itinerariesPerMonth;

  // Simple mock tracking: in a real app this would query Itineraries created this month by this org
  // Here we just allow it for the mock implementation
  return true;
}

/**
 * Usage hook called after an itinerary is generated or saved.
 */
async function trackUsageHook(organizationId, usageType) {
  if (!organizationId) return;
  console.log(`[billingService] Tracked usage type '${usageType}' for org ${organizationId}`);
  // In a real implementation, this would sync with Stripe / usage metrics
}

module.exports = {
  TIER_LIMITS,
  canCreateItinerary,
  trackUsageHook
};
