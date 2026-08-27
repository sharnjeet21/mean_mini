'use strict';

/**
 * costEstimationService
 *
 * Provides deterministic cost estimates based on destination, duration,
 * traveler count, and travel style. Falls back from AI-powered estimates
 * to a deterministic model when the AI provider is unavailable.
 */

const BASE_COSTS = {
  transport: 20,
  accommodation: 35,
  food: 24,
  activities: 16,
  miscellaneous: 8,
};

const STYLE_MULTIPLIERS = {
  budget: 0.5,
  balanced: 0.9,
  premium: 1.4,
  luxury: 2.0,
};

const DESTINATION_MULTIPLIERS = {
  // Expensive
  zurich: 1.8, geneva: 1.8, lucerne: 1.6, swiss: 1.6,
  'new york': 1.6, london: 1.5, paris: 1.4, tokyo: 1.4,
  oslo: 1.6, singapore: 1.4, sydney: 1.4, santorini: 1.3,
  // Moderate
  rome: 1.1, barcelona: 1.0, madrid: 1.0, berlin: 1.0,
  athens: 0.9, kyoto: 1.1, osaka: 1.0, dubai: 1.2,
  // Budget-friendly
  goa: 0.4, jaipur: 0.3, mumbai: 0.5, delhi: 0.4,
  hanoi: 0.3, bangkok: 0.4, bali: 0.4, ubud: 0.3,
  kerala: 0.3, munnar: 0.3, leh: 0.4, ladakh: 0.4,
  solan: 0.2, meghalaya: 0.3, shillong: 0.3,
};

function getDestinationMultiplier(destination) {
  if (!destination) return 1.0;
  const normalized = destination.toLowerCase();
  for (const [key, value] of Object.entries(DESTINATION_MULTIPLIERS)) {
    if (normalized.includes(key)) return value;
  }
  return 1.0;
}

function getTips(style, destMult) {
  const tips = [];
  if (style === 'budget') {
    tips.push('Look for hostels or shared accommodations.');
    tips.push('Use public transit instead of taxis.');
  } else if (style === 'luxury' || style === 'premium') {
    tips.push('Consider booking private transfers.');
    tips.push('Look for boutique hotels with highly rated amenities.');
  } else {
    tips.push('Book flights and hotels early for the best balanced rates.');
  }

  if (destMult > 1.4) {
    tips.push('This destination is expensive — consider city tourism passes.');
  } else if (destMult < 0.6) {
    tips.push('Local street food and regional experiences are affordable and authentic.');
  }
  return tips;
}

async function estimateCost({ destination, duration, travelerCount, travelStyle, userBudget }) {
  // Try AI-powered estimation first if Gemini is configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const { getAiProvider } = require('./aiProviderResolver');
      const provider = getAiProvider();
      if (typeof provider.estimateBudget === 'function') {
        const aiResult = await provider.estimateBudget({
          destination,
          duration,
          travelerCount,
          travelStyle,
          userBudget,
        });
        if (aiResult && aiResult.totalEstimated > 0) {
          return _buildResult(aiResult.totalEstimated, travelerCount, userBudget, {
            costLevel: aiResult.costLevel,
            breakdown: aiResult.breakdown,
            tips: aiResult.tips,
          });
        }
      }
    } catch (err) {
      console.warn('[costEstimationService] AI estimation failed, using deterministic fallback:', err.message);
    }
  }

  // Deterministic fallback
  const days = Math.max(1, duration || 1);
  const travelers = Math.max(1, travelerCount || 1);
  const styleMult = STYLE_MULTIPLIERS[travelStyle] || STYLE_MULTIPLIERS.balanced;
  const destMult = getDestinationMultiplier(destination);
  const combinedMult = Math.min(2.5, styleMult * destMult);

  const transport = Math.round(BASE_COSTS.transport * combinedMult) * days * travelers;
  const accommodation =
    Math.round(BASE_COSTS.accommodation * combinedMult) * days * Math.max(1, Math.ceil(travelers / 2));
  const food = Math.round(BASE_COSTS.food * combinedMult) * days * travelers;
  const activities = Math.round(BASE_COSTS.activities * combinedMult) * days * travelers;
  const miscellaneous = Math.round(BASE_COSTS.miscellaneous * combinedMult) * days * travelers;

  const totalEstimated = transport + accommodation + food + activities + miscellaneous;

  let costLevel = 'moderate';
  if (combinedMult < 0.7) costLevel = 'budget';
  if (combinedMult > 1.6) costLevel = 'expensive';

  return _buildResult(totalEstimated, travelers, userBudget, {
    costLevel,
    breakdown: { transport, accommodation, food, activities, miscellaneous },
    tips: getTips(travelStyle, destMult),
  });
}

function _buildResult(totalEstimated, travelers, userBudget, extra) {
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
        budgetWarning = 'Your budget is slightly tight — you may need to compromise on some activities or dining.';
      } else if (budgetNum > totalEstimated * 1.5) {
        budgetScore = 90;
        budgetWarning = 'Your budget is generous. Consider upgrading to a premium experience.';
      }
    }
  }

  return {
    totalEstimated,
    confidenceRange: {
      min: Math.round(totalEstimated * 0.8),
      max: Math.round(totalEstimated * 1.3),
    },
    budgetScore: Math.round(budgetScore),
    budgetWarning,
    perPerson: Math.round(totalEstimated / Math.max(1, travelers)),
    currency: 'USD',
    ...extra,
  };
}

module.exports = { estimateCost };
