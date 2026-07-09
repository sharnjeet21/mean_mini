'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const itineraryDraftService = require('../services/itineraryDraftService');
const OllamaProvider = require('../services/providers/ollamaProvider');
const GeminiProvider = require('../services/providers/geminiProvider');

describe('AI Itinerary Revision Precision & Constraints', () => {
  let originalOllamaScope, originalOllamaRevise;
  let originalGeminiScope, originalGeminiRevise;

  beforeEach(() => {
    originalOllamaScope = OllamaProvider.prototype.extractRevisionScope;
    originalOllamaRevise = OllamaProvider.prototype.reviseItinerary;
    originalGeminiScope = GeminiProvider.prototype.extractRevisionScope;
    originalGeminiRevise = GeminiProvider.prototype.reviseItinerary;

    const mockExtract = async (instruction, duration) => {
      const norm = instruction.toLowerCase();
      let scopeType = 'full_revision';
      let targetDays = [];
      let preserveDays = [];
      let allowedFields = [];
      let protectedFields = [];
      let targetDuration = null;

      if (norm.includes('6 days') || norm.includes('7 days')) {
        scopeType = 'structural';
        preserveDays = [1, 2, 3];
        targetDuration = norm.includes('6 days') ? 6 : 7;
      } else if (norm.includes('day 3')) {
        scopeType = 'day_specific';
        targetDays = [3];
        preserveDays = [1, 2, 4];
      } else if (norm.includes('day 2')) {
        scopeType = 'multi_day';
        targetDays = [1, 3, 4];
        preserveDays = [2];
      } else if (norm.includes('budget') || norm.includes('locations')) {
        scopeType = 'global_field';
        allowedFields = ['budget'];
        protectedFields = ['location'];
      }

      return {
        scopeType,
        targetDays,
        preserveDays,
        allowedFields,
        protectedFields,
        targetDuration,
        intent: instruction
      };
    };

    const mockRevise = async (currentData, instruction, scope, operation) => {
      if (operation === 'replace_day') {
        return {
          operation: 'replace_day',
          day: 3,
          dayData: {
            day: 3,
            title: 'Day 3 - Extreme Adventurous Activities',
            activities: [
              { time: '10:00 AM', activity: 'Local Walk', description: 'Walk around', location: 'Solan' },
              { time: '02:00 PM', activity: 'Skydiving', description: 'Jump out of a plane.', location: 'Drop Zone' }
            ]
          }
        };
      } else if (operation === 'replace_days') {
        return {
          operation: 'replace_days',
          days: [
            {
              day: 1,
              title: 'Modified Day 1 Theme',
              activities: [{ time: '10:00 AM', activity: 'Local Walk', description: 'Walk around', location: 'Solan Mall' }]
            },
            {
              day: 3,
              title: 'Modified Day 3 Theme',
              activities: [{ time: '11:00 AM', activity: 'Forest Walk', description: 'Walk', location: 'Barog' }]
            },
            {
              day: 4,
              title: 'Modified Day 4 Theme',
              activities: [{ time: '12:00 PM', activity: 'Shopping', description: 'Shop', location: 'Solan Bazaar' }]
            }
          ]
        };
      } else if (operation === 'update_fields') {
        return {
          operation: 'update_fields',
          changes: {
            budget: 500
          }
        };
      } else if (operation === 'extend_days') {
        const target = scope.targetDuration || 6;
        const newDays = [];
        for (let d = currentData.dailyPlan.length + 1; d <= target; d++) {
          newDays.push({
            day: d,
            title: `Day ${d}`,
            activities: [{ time: '10:00 AM', activity: 'Chill', description: 'Relax', location: 'Solan' }]
          });
        }
        return {
          operation: 'extend_days',
          targetDuration: target,
          days: newDays
        };
      }
    };

    OllamaProvider.prototype.extractRevisionScope = mockExtract;
    OllamaProvider.prototype.reviseItinerary = mockRevise;
    GeminiProvider.prototype.extractRevisionScope = mockExtract;
    GeminiProvider.prototype.reviseItinerary = mockRevise;
  });

  afterEach(() => {
    OllamaProvider.prototype.extractRevisionScope = originalOllamaScope;
    OllamaProvider.prototype.reviseItinerary = originalOllamaRevise;
    GeminiProvider.prototype.extractRevisionScope = originalGeminiScope;
    GeminiProvider.prototype.reviseItinerary = originalGeminiRevise;
  });

  const getOriginalItinerary = () => ({
    _id: '507f1f77bcf86cd799439011',
    title: 'Trip to Solan',
    destination: 'Solan',
    duration: 4,
    budget: 1000,
    dailyPlan: [
      { day: 1, title: 'Day 1: Arrival', activities: [{ time: '10:00 AM', activity: 'Local Walk', location: 'Solan Mall' }] },
      { day: 2, title: 'Day 2: Trekking', activities: [{ time: '09:00 AM', activity: 'Karol Tibba Trek', location: 'Karol Caves' }] },
      { day: 3, title: 'Day 3: Nature', activities: [{ time: '11:00 AM', activity: 'Forest Walk', location: 'Barog' }] },
      { day: 4, title: 'Day 4: Departure', activities: [{ time: '12:00 PM', activity: 'Local Shopping', location: 'Solan Bazaar' }] }
    ],
    updatedAt: new Date('2026-07-09T20:00:00Z'),
    __v: 1
  });

  it('Test Case 1: Only make Day 3 more adventurous - preserves Day 1, 2, and 4', async () => {
    const original = getOriginalItinerary();
    const result = await itineraryDraftService.reviseItinerary(original, 'Only make Day 3 more adventurous');

    assert.equal(result.dailyPlan[2].title, 'Day 3 - Extreme Adventurous Activities');
    assert.equal(result.dailyPlan[2].activities[1].activity, 'Skydiving');

    assert.equal(result.dailyPlan[0].title, original.dailyPlan[0].title);
    assert.deepEqual(result.dailyPlan[0].activities, original.dailyPlan[0].activities);
    assert.equal(result.dailyPlan[1].title, original.dailyPlan[1].title);
    assert.equal(result.dailyPlan[3].title, original.dailyPlan[3].title);
  });

  it('Test Case 2: Do not change Day 2. Improve the remaining days - Day 2 exactly matches original', async () => {
    const original = getOriginalItinerary();
    const result = await itineraryDraftService.reviseItinerary(original, 'Do not change Day 2. Improve the remaining days');

    assert.equal(result.dailyPlan[1].title, original.dailyPlan[1].title);
    assert.deepEqual(result.dailyPlan[1].activities, original.dailyPlan[1].activities);
  });

  it('Test Case 3: Reduce the budget without changing locations - preserves locations', async () => {
    const original = getOriginalItinerary();
    const result = await itineraryDraftService.reviseItinerary(original, 'Reduce the budget to 500 without changing any locations');

    assert.equal(result.budget, 500);
    assert.equal(result.dailyPlan[0].activities[0].location, 'Solan Mall');
  });

  it('Test Case 4: Extend this itinerary to 6 days while preserving the first 3 days - preserves first 3 and numbering', async () => {
    const original = getOriginalItinerary();
    const result = await itineraryDraftService.reviseItinerary(original, 'Extend this itinerary to 6 days while preserving the first 3 days');

    assert.equal(result.dailyPlan.length, 6);
    assert.equal(result.dailyPlan[0].title, original.dailyPlan[0].title);
    assert.equal(result.dailyPlan[1].title, original.dailyPlan[1].title);
    assert.equal(result.dailyPlan[2].title, original.dailyPlan[2].title);
    assert.deepEqual(result.dailyPlan.map(d => d.day), [1, 2, 3, 4, 5, 6]);
  });

  it('Test Case 9: Send two identical revision requests concurrently - deduplication registry acts', async () => {
    const original = getOriginalItinerary();
    let callCount = 0;
    
    const originalRevise = OllamaProvider.prototype.reviseItinerary;
    OllamaProvider.prototype.reviseItinerary = async function(data, inst, scope, op) {
      callCount++;
      return {
        operation: op,
        day: 3,
        dayData: {
          day: 3,
          title: 'Day 3 - Extreme Adventurous Activities',
          activities: [
            { time: '10:00 AM', activity: 'Walk', description: 'Walk', location: 'Solan' }
          ]
        }
      };
    };
    GeminiProvider.prototype.reviseItinerary = async function(data, inst, scope, op) {
      callCount++;
      return {
        operation: op,
        day: 3,
        dayData: {
          day: 3,
          title: 'Day 3 - Extreme Adventurous Activities',
          activities: [
            { time: '10:00 AM', activity: 'Walk', description: 'Walk', location: 'Solan' }
          ]
        }
      };
    };

    const [res1, res2] = await Promise.all([
      itineraryDraftService.reviseItinerary(original, 'Only make Day 3 more adventurous', 'user123'),
      itineraryDraftService.reviseItinerary(original, 'Only make Day 3 more adventurous', 'user123')
    ]);

    assert.equal(callCount, 1);
    assert.deepEqual(res1.dailyPlan, res2.dailyPlan);

    OllamaProvider.prototype.reviseItinerary = originalRevise;
  });

  it('Test Case 10: Invalidate cache after manual edit (different version or updatedAt)', async () => {
    const original = getOriginalItinerary();
    
    await itineraryDraftService.reviseItinerary(original, 'Only make Day 3 more adventurous', 'user123');

    const modifiedItinerary = {
      ...original,
      __v: 2,
      updatedAt: new Date('2026-07-09T21:00:00Z')
    };

    let callCount = 0;
    const originalRevise = OllamaProvider.prototype.reviseItinerary;
    OllamaProvider.prototype.reviseItinerary = async function(data, inst, scope, op) {
      callCount++;
      return {
        operation: op,
        day: 3,
        dayData: {
          day: 3,
          title: 'Day 3 - Extreme Adventurous Activities',
          activities: [
            { time: '10:00 AM', activity: 'Walk', description: 'Walk', location: 'Solan' }
          ]
        }
      };
    };
    GeminiProvider.prototype.reviseItinerary = async function(data, inst, scope, op) {
      callCount++;
      return {
        operation: op,
        day: 3,
        dayData: {
          day: 3,
          title: 'Day 3 - Extreme Adventurous Activities',
          activities: [
            { time: '10:00 AM', activity: 'Walk', description: 'Walk', location: 'Solan' }
          ]
        }
      };
    };

    await itineraryDraftService.reviseItinerary(modifiedItinerary, 'Only make Day 3 more adventurous', 'user123');
    assert.equal(callCount, 1);

    OllamaProvider.prototype.reviseItinerary = originalRevise;
  });

  it('Regression: add 2 days to 5-day itinerary (expected targetDuration = 7)', async () => {
    const original = getOriginalItinerary();
    original.dailyPlan.push({ day: 5, title: 'Day 5', activities: [] });
    original.duration = 5;

    const result = await itineraryDraftService.reviseItinerary(original, 'add 2 days');
    assert.equal(result.dailyPlan.length, 7);
  });

  it('Regression: add two more days to 5-day itinerary (expected targetDuration = 7)', async () => {
    const original = getOriginalItinerary();
    original.dailyPlan.push({ day: 5, title: 'Day 5', activities: [] });
    original.duration = 5;

    const result = await itineraryDraftService.reviseItinerary(original, 'add two more days');
    assert.equal(result.dailyPlan.length, 7);
  });

  it('Regression: extend by 2 days to 5-day itinerary (expected targetDuration = 7)', async () => {
    const original = getOriginalItinerary();
    original.dailyPlan.push({ day: 5, title: 'Day 5', activities: [] });
    original.duration = 5;

    const result = await itineraryDraftService.reviseItinerary(original, 'extend by 2 days');
    assert.equal(result.dailyPlan.length, 7);
  });

  it('Regression: extend to 7 days for 5-day itinerary (expected targetDuration = 7)', async () => {
    const original = getOriginalItinerary();
    original.dailyPlan.push({ day: 5, title: 'Day 5', activities: [] });
    original.duration = 5;

    const result = await itineraryDraftService.reviseItinerary(original, 'extend to 7 days');
    assert.equal(result.dailyPlan.length, 7);
  });

  it('Regression: remove 2 days for 7-day itinerary (expected targetDuration = 5)', async () => {
    const original = getOriginalItinerary();
    original.dailyPlan.push({ day: 5, title: 'Day 5', activities: [] });
    original.dailyPlan.push({ day: 6, title: 'Day 6', activities: [] });
    original.dailyPlan.push({ day: 7, title: 'Day 7', activities: [] });
    original.duration = 7;

    const originalRevise = OllamaProvider.prototype.reviseItinerary;
    OllamaProvider.prototype.reviseItinerary = async function(data, inst, scope, op) {
      assert.equal(scope.targetDuration, 5);
      return {
        operation: op,
        targetDuration: 5,
        days: data.dailyPlan.slice(0, 5)
      };
    };

    const result = await itineraryDraftService.reviseItinerary(original, 'remove 2 days');
    assert.equal(result.dailyPlan.length, 5);
    OllamaProvider.prototype.reviseItinerary = originalRevise;
  });

  it('Regression: shorten by 2 days for 7-day itinerary (expected targetDuration = 5)', async () => {
    const original = getOriginalItinerary();
    original.dailyPlan.push({ day: 5, title: 'Day 5', activities: [] });
    original.dailyPlan.push({ day: 6, title: 'Day 6', activities: [] });
    original.dailyPlan.push({ day: 7, title: 'Day 7', activities: [] });
    original.duration = 7;

    const originalRevise = OllamaProvider.prototype.reviseItinerary;
    OllamaProvider.prototype.reviseItinerary = async function(data, inst, scope, op) {
      assert.equal(scope.targetDuration, 5);
      return {
        operation: op,
        targetDuration: 5,
        days: data.dailyPlan.slice(0, 5)
      };
    };

    const result = await itineraryDraftService.reviseItinerary(original, 'shorten by 2 days');
    assert.equal(result.dailyPlan.length, 5);
    OllamaProvider.prototype.reviseItinerary = originalRevise;
  });

  it('Regression: compound relaxation day instruction (expected final duration = 7)', async () => {
    const original = getOriginalItinerary();
    original.dailyPlan.push({ day: 5, title: 'Day 5', activities: [] });
    original.duration = 5;

    const result = await itineraryDraftService.reviseItinerary(original, 'add 2 days and also add a relaxation day in between');
    assert.equal(result.dailyPlan.length, 7);
  });

  it('Regression: add a relaxation day without duration extension (no structural change parsed)', async () => {
    const original = getOriginalItinerary();
    
    const originalRevise = OllamaProvider.prototype.reviseItinerary;
    OllamaProvider.prototype.reviseItinerary = async function(data, inst, scope, op) {
      assert.notEqual(op, 'extend_days');
      return {
        operation: 'replace_days',
        days: []
      };
    };

    await itineraryDraftService.reviseItinerary(original, 'add a relaxation day');
    OllamaProvider.prototype.reviseItinerary = originalRevise;
  });
});
