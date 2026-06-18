'use strict';

const TRANSPORT_SCORES = {
  walk: 100,
  bicycle: 98,
  public_transport: 82,
  train: 78,
  mixed: 58,
  car: 38,
  flight: 18,
};

const ACCOMMODATION_SCORES = {
  eco_lodge: 92,
  homestay: 78,
  hostel: 72,
  hotel: 55,
  other: 50,
  resort: 35,
};

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function getDurationDays(itinerary) {
  const start = itinerary.startDate ? new Date(itinerary.startDate) : null;
  const end = itinerary.endDate ? new Date(itinerary.endDate) : null;

  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
  }

  const match = String(itinerary.duration || '').match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : 1;
}

function getBudgetBreakdownTotal(breakdown = {}) {
  return ['transport', 'accommodation', 'food', 'activities', 'contingency']
    .reduce((total, key) => total + Math.max(0, Number(breakdown[key]) || 0), 0);
}

function analyzeTrip(source) {
  const itinerary = typeof source.toObject === 'function' ? source.toObject() : source;
  const durationDays = getDurationDays(itinerary);
  const travelerCount = Math.max(1, Number(itinerary.travelerCount) || 1);
  const budget = Math.max(0, Number(itinerary.budget) || 0);
  const dailyPlan = Array.isArray(itinerary.dailyPlan) ? itinerary.dailyPlan : [];
  const activityCounts = dailyPlan.map((day) => Array.isArray(day.activities) ? day.activities.length : 0);
  const activityCount = activityCounts.reduce((sum, count) => sum + count, 0);
  const averageActivitiesPerDay = durationDays ? activityCount / durationDays : 0;
  const plannedDays = new Set(dailyPlan.map((day) => Number(day.day)).filter(Boolean)).size;
  const budgetBreakdownTotal = getBudgetBreakdownTotal(itinerary.budgetBreakdown);
  const budgetVariance = budget ? budgetBreakdownTotal - budget : 0;
  const budgetPerDay = durationDays ? budget / durationDays : budget;
  const budgetPerTraveler = budget / travelerCount;
  const budgetPerTravelerPerDay = budgetPerTraveler / durationDays;

  let completenessScore = 30;
  if (String(itinerary.description || '').trim().length >= 50) completenessScore += 10;
  completenessScore += Math.min(25, (plannedDays / durationDays) * 25);
  if (activityCount >= durationDays * 2) completenessScore += 10;
  if (itinerary.tripSummary?.highlights?.length) completenessScore += 10;
  if (budgetBreakdownTotal > 0) completenessScore += 15;
  completenessScore = clamp(completenessScore);

  let paceScore = 100;
  if (averageActivitiesPerDay > 6) paceScore -= (averageActivitiesPerDay - 6) * 12;
  if (averageActivitiesPerDay > 0 && averageActivitiesPerDay < 2) paceScore -= 12;
  if (plannedDays < durationDays) paceScore -= ((durationDays - plannedDays) / durationDays) * 30;
  paceScore = clamp(paceScore);

  let budgetScore = 100;
  if (budget <= 0) budgetScore = 15;
  else if (budgetPerTravelerPerDay < 20) budgetScore = 45;
  else if (budgetPerTravelerPerDay < 35) budgetScore = 70;
  if (budgetBreakdownTotal > 0 && Math.abs(budgetVariance) > budget * 0.15) budgetScore -= 20;
  if (Number(itinerary.budgetBreakdown?.contingency || 0) < budget * 0.05) budgetScore -= 8;
  budgetScore = clamp(budgetScore);

  const transportScore = TRANSPORT_SCORES[itinerary.transportMode] ?? TRANSPORT_SCORES.mixed;
  const accommodationScore = ACCOMMODATION_SCORES[itinerary.accommodationType] ?? ACCOMMODATION_SCORES.other;
  const sustainabilityScore = clamp(transportScore * 0.7 + accommodationScore * 0.3);
  const feasibilityScore = clamp(
    completenessScore * 0.35 +
    paceScore * 0.25 +
    budgetScore * 0.25 +
    sustainabilityScore * 0.15
  );

  const risks = [];
  if (plannedDays < durationDays) {
    risks.push({
      severity: plannedDays === 0 ? 'high' : 'medium',
      code: 'UNPLANNED_DAYS',
      title: 'Schedule has uncovered days',
      message: `${durationDays - plannedDays} of ${durationDays} trip days do not yet have a daily plan.`,
    });
  }
  if (averageActivitiesPerDay > 6) {
    risks.push({
      severity: 'high',
      code: 'OVERLOADED_SCHEDULE',
      title: 'Daily schedule may be exhausting',
      message: `The plan averages ${averageActivitiesPerDay.toFixed(1)} activities per day. Consider keeping one flexible block each day.`,
    });
  }
  if (budgetPerTravelerPerDay < 20) {
    risks.push({
      severity: 'high',
      code: 'LOW_DAILY_BUDGET',
      title: 'Daily budget may be unrealistic',
      message: `Only $${budgetPerTravelerPerDay.toFixed(0)} is available per traveler per day.`,
    });
  }
  if (budgetBreakdownTotal > 0 && Math.abs(budgetVariance) > budget * 0.15) {
    risks.push({
      severity: 'medium',
      code: 'BUDGET_MISMATCH',
      title: 'Budget breakdown does not match total',
      message: `The category total differs from the trip budget by $${Math.abs(budgetVariance).toFixed(0)}.`,
    });
  }
  if (itinerary.transportMode === 'flight' && durationDays <= 3) {
    risks.push({
      severity: 'medium',
      code: 'HIGH_IMPACT_SHORT_TRIP',
      title: 'High-impact transport for a short trip',
      message: 'A flight-heavy trip of three days or fewer has a comparatively high emissions footprint.',
    });
  }

  const recommendations = [];
  if (plannedDays < durationDays) recommendations.push('Add activities for every travel day to improve plan completeness.');
  if (budgetBreakdownTotal === 0) recommendations.push('Split the budget into transport, stay, food, activities, and contingency.');
  if (Number(itinerary.budgetBreakdown?.contingency || 0) < budget * 0.05) recommendations.push('Reserve 5–10% of the budget for emergencies and price changes.');
  if (sustainabilityScore < 60) recommendations.push('Use rail or public transport for local transfers where practical.');
  if (averageActivitiesPerDay > 6) recommendations.push('Move lower-priority activities into an optional list.');
  if (recommendations.length === 0) recommendations.push('The plan is well balanced; confirm reservations and local operating hours before departure.');

  const paceLabel = averageActivitiesPerDay > 6
    ? 'Intensive'
    : averageActivitiesPerDay >= 4
      ? 'Active'
      : averageActivitiesPerDay >= 2
        ? 'Balanced'
        : 'Relaxed';

  return {
    generatedAt: new Date().toISOString(),
    scores: {
      feasibility: feasibilityScore,
      completeness: completenessScore,
      pace: paceScore,
      budget: budgetScore,
      sustainability: sustainabilityScore,
    },
    metrics: {
      durationDays,
      travelerCount,
      plannedDays,
      activityCount,
      averageActivitiesPerDay: Number(averageActivitiesPerDay.toFixed(1)),
      paceLabel,
      budgetPerDay: Number(budgetPerDay.toFixed(2)),
      budgetPerTraveler: Number(budgetPerTraveler.toFixed(2)),
      budgetPerTravelerPerDay: Number(budgetPerTravelerPerDay.toFixed(2)),
      budgetBreakdownTotal: Number(budgetBreakdownTotal.toFixed(2)),
      budgetVariance: Number(budgetVariance.toFixed(2)),
    },
    risks,
    recommendations,
  };
}

module.exports = {
  analyzeTrip,
  getDurationDays,
  getBudgetBreakdownTotal,
};
