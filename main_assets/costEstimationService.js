/**
 * @file server/services/costEstimationService.js
 * 
 * Provides deterministic cost estimates based on destination, duration,
 * traveler count, and travel style.
 */

'use strict';

const aiProvider = require('./aiProvider');

const BASE_COSTS = {
  transport: 20, // baseline budget per day per person - reduced by ~20%
  accommodation: 35, // reduced by ~22%
  food: 24, // reduced by 20%
  activities: 16, // reduced by 20%
  miscellaneous: 8 // reduced by 20%
};

const STYLE_MULTIPLIERS = {
  budget: 0.5, // slightly more aggressive reduction for budget travelers
  balanced: 0.9, // reduced from 1.0 to bring general estimates down
  luxury: 2.0 // reduced from 2.5 to prevent extreme spikes
};

// Simple destination cost multipliers
const DESTINATION_MULTIPLIERS = {
  // Expensive - slightly lowered to prevent excessive peaks
  'zurich': 1.8, 'geneva': 1.8, 'lucerne': 1.6, 'swiss': 1.6,
  'new york': 1.6, 'london': 1.5, 'paris': 1.4, 'tokyo': 1.4,
  'oslo': 1.6, 'singapore': 1.4, 'sydney': 1.4, 'santorini': 1.3,
  // Moderate - aligned with general reduction
  'rome': 1.1, 'barcelona': 1.0, 'madrid': 1.0, 'berlin': 1.0,
  'athens': 0.9, 'kyoto': 1.1, 'osaka': 1.0, 'dubai': 1.2,
  // Budget-friendly - keeping these low but ensuring they aren't unrealistically low
  'goa': 0.4, 'jaipur': 0.3, 'mumbai': 0.5, 'delhi': 0.4,
  'hanoi': 0.3, 'bangkok': 0.4, 'bali': 0.4, 'ubud': 0.3,
  'kerala': 0.3, munnar: 0.3, 'leh': 0.4, 'ladakh': 0.4,
  'solan': 0.2, 'meghalaya': 0.3, 'shillong': 0.3
};

function getDestinationMultiplier(destination) {
  if (!destination) return 1.0;
  const normalized = destination.toLowerCase();

  for (const [key, value] of Object.entries(DESTINATION_MULTIPLIERS)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  return 1.0; // Default multiplier
}

async function estimateCost({ destination, duration, travelerCount, travelStyle, userBudget }) {
  if (process.env.GEMINI_API_KEY) {
    try {
      const aiResult = await aiProvider.estimateBudget({ destination, duration, travelerCount, travelStyle, userBudget });
      if (aiResult && aiResult.totalEstimated > 0) {
        let budgetScore = 100;
        let budgetWarning = null;
        if (userBudget) {
          const budgetNum = Number(userBudget);
          if (budgetNum > 0) {
            if (budgetNum < aiResult.totalEstimated * 0.7) {
              budgetScore = Math.max(0, 100 - ((aiResult.totalEstimated - budgetNum) / aiResult.totalEstimated) * 100);
              budgetWarning = 'Your budget is significantly lower than typical costs for this style and destination.';
            } else if (budgetNum < aiResult.totalEstimated * 0.9) {
              budgetScore = 80;
              budgetWarning = 'Your budget is slightly tight, you may need to compromise on some activities or dining.';
            } else if (budgetNum > aiResult.totalEstimated * 1.5) {
              budgetScore = 90;
              budgetWarning = 'Your budget is generous for this travel style. You might consider upgrading to a premium experience.';
            }
          }
        }
        return {
          totalEstimated: aiResult.totalEstimated,
          confidenceRange: {
            min: Math.round(aiResult.totalEstimated * 0.8),
            max: Math.round(aiResult.totalEstimated * 1.3)
          },
          budgetScore: Math.round(budgetScore),
          budgetWarning,
          perPerson: Math.round(aiResult.totalEstimated / Math.max(1, travelerCount || 1)),
          currency: "USD",
          costLevel: aiResult.costLevel,
          breakdown: aiResult.breakdown,
          tips: aiResult.tips
        };
      }
    } catch (err) {
      console.warn('[costEstimationService] AI estimation failed, falling back to deterministic: ', err.message);
    }
  }

  const days = Math.max(1, duration || 1);
  const travelers = Math.max(1, travelerCount || 1);
  const styleMult = STYLE_MULTIPLIERS[travelStyle] || STYLE_MULTIPLIERS.balanced;
  const destMult = getDestinationMultiplier(destination);

  // Use a balanced combined multiplier to prevent exponential growth
  // Cap the maximum combined multiplier to 3.0x
  // Cap the maximum combined multiplier to 2.5x to avoid excessive overestimation in luxury/expensive combos
  const combinedMult = Math.min(2.5, styleMult * destMult);

  // Calculate per person per day
  const dailyTransport = Math.round(BASE_COSTS.transport * combinedMult);
  const dailyFood = Math.round(BASE_COSTS.food * combinedMult);
  const dailyAct = Math.round(BASE_COSTS.activities * combinedMult);
  const dailyMisc = Math.round(BASE_COSTS.miscellaneous * combinedMult);

  // Accommodation multiplier is handled slightly differently to ensure consistency with sharing
  // We apply the multiplier to the base room cost, not the per-person cost
  const dailyAccomBase = Math.round(BASE_COSTS.accommodation * combinedMult);

  // Total for trip
  const transport = dailyTransport * days * travelers;
  // Accommodation is calculated as: (Cost per room) * days * (Number of rooms needed)
  const accommodation = dailyAccomBase * days * Math.max(1, Math.ceil(travelers / 2));
  const food = dailyFood * days * travelers;
  const activities = dailyAct * days * travelers;
  const miscellaneous = dailyMisc * days * travelers;

  const totalEstimated = transport + accommodation + food + activities + miscellaneous;

  // Calculate budget score (0-100) based on user's budget vs estimate
  let budgetScore = 100;
  let budgetWarning = null;
  if (userBudget) {
    const budgetNum = Number(userBudget);
    if (budgetNum > 0) {
      if (budgetNum < totalEstimated * 0.7) {
        budgetScore = Math.max(0, 100 - ((totalEstimated - budgetNum) / totalEstimated) * 100);
        budgetWarning = 'Your budget is significantly lower than typical costs for this style and destination.';
      } else if (budgetNum < totalEstimated * 0.9) {
        budgetScore = 80;
        budgetWarning = 'Your budget is slightly tight, you may need to compromise on some activities or dining.';
      } else if (budgetNum > totalEstimated * 1.5) {
        budgetScore = 90; // High budget is fine but maybe they can upgrade travel style
        budgetWarning = 'Your budget is generous for this travel style. You might consider upgrading to a premium experience.';
      }
    }
  }

  let costLevel = "moderate";
  if (combinedMult < 0.7) costLevel = "budget";
  if (combinedMult > 1.6) costLevel = "expensive";

  return {
    totalEstimated,
    confidenceRange: {
      min: Math.round(totalEstimated * 0.8),
      max: Math.round(totalEstimated * 1.3)
    },
    budgetScore: Math.round(budgetScore),
    budgetWarning,
    perPerson: Math.round(totalEstimated / travelers),
    currency: "USD", // Keep USD standard for now to avoid conversion confusion
    costLevel,
    breakdown: {
      transport,
      accommodation,
      food,
      activities,
      miscellaneous
    },
    tips: getTips(travelStyle, destMult)
  };
}

function getTips(style, destMult) {
  const tips = [];
  if (style === 'budget') {
    tips.push("Look for hostels or shared accommodations.");
    tips.push("Use public transit instead of taxis.");
  } else if (style === 'luxury') {
    tips.push("Consider booking private transfers.");
    tips.push("Look for boutique hotels with highly rated amenities.");
  } else {
    tips.push("Book flights and hotels early for the best balanced rates.");
  }

  if (destMult > 1.4) {
    tips.push("This destination is known to be expensive; consider city tourism passes to save on attractions.");
  } else if (destMult < 0.6) {
    tips.push("Local street food and regional experiences are both authentic and very affordable here.");
  }

  return tips;
}

module.exports = {
  estimateCost
};
