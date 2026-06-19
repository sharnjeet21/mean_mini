'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeTrip, getDurationDays } = require('../utils/tripAnalyzer');

const completeTrip = {
  title: 'Rail and Trails',
  destination: 'Himachal Pradesh',
  startDate: '2026-10-01',
  endDate: '2026-10-03',
  duration: '3 Days / 2 Nights',
  budget: 900,
  travelerCount: 2,
  description: 'A carefully planned low-impact mountain trip with enough detail for travelers.',
  transportMode: 'train',
  accommodationType: 'homestay',
  budgetBreakdown: {
    transport: 180,
    accommodation: 300,
    food: 180,
    activities: 150,
    contingency: 90,
  },
  dailyPlan: [1, 2, 3].map((day) => ({
    day,
    title: `Day ${day}`,
    activities: [
      { time: '09:00', activity: 'Morning activity' },
      { time: '14:00', activity: 'Afternoon activity' },
    ],
  })),
  tripSummary: { highlights: ['Scenic railway', 'Mountain trail'] },
};

describe('tripAnalyzer', () => {
  it('calculates inclusive trip duration from dates', () => {
    assert.equal(getDurationDays(completeTrip), 3);
  });

  it('produces high scores for a complete and balanced trip', () => {
    const analysis = analyzeTrip(completeTrip);

    assert.ok(analysis.scores.feasibility >= 80);
    assert.ok(analysis.scores.completeness >= 90);
    assert.equal(analysis.metrics.budgetPerTravelerPerDay, 150);
    assert.equal(analysis.metrics.paceLabel, 'Balanced');
    assert.equal(analysis.risks.length, 0);
  });

  it('flags missing days, overloaded schedules, and unrealistic budget', () => {
    const riskyTrip = {
      ...completeTrip,
      budget: 50,
      dailyPlan: [{
        day: 1,
        title: 'Everything at once',
        activities: Array.from({ length: 22 }, (_, index) => ({
          time: `${index}:00`,
          activity: `Activity ${index}`,
        })),
      }],
      budgetBreakdown: {},
    };

    const analysis = analyzeTrip(riskyTrip);
    const codes = analysis.risks.map((risk) => risk.code);

    assert.ok(codes.includes('UNPLANNED_DAYS'));
    assert.ok(codes.includes('OVERLOADED_SCHEDULE'));
    assert.ok(codes.includes('LOW_DAILY_BUDGET'));
    assert.ok(analysis.scores.feasibility < 75);
  });
});
