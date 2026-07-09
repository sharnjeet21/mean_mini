'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const itineraryDraftService = require('../services/itineraryDraftService');

describe('Duration Parser Bug Reproduction', () => {
  it('reproduces and asserts scope for compound relative instruction', async () => {
    const original = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Trip to Solan',
      destination: 'Solan',
      duration: 5,
      budget: 1000,
      dailyPlan: [
        { day: 1, title: 'Day 1', activities: [] },
        { day: 2, title: 'Day 2', activities: [] },
        { day: 3, title: 'Day 3', activities: [] },
        { day: 4, title: 'Day 4', activities: [] },
        { day: 5, title: 'Day 5', activities: [] }
      ]
    };

    // We stub reviseItinerary's execution block right before LLM call to extract the calculated scope
    const originalRevise = require('../services/providers/ollamaProvider').prototype.reviseItinerary;
    let capturedScope = null;
    
    require('../services/providers/ollamaProvider').prototype.reviseItinerary = async function(data, inst, scope, op) {
      capturedScope = scope;
      return { operation: op, targetDuration: scope.targetDuration, days: [] };
    };
    require('../services/providers/geminiProvider').prototype.reviseItinerary = async function(data, inst, scope, op) {
      capturedScope = scope;
      return { operation: op, targetDuration: scope.targetDuration, days: [] };
    };

    try {
      await itineraryDraftService.reviseItinerary(original, 'add 2 days and also add a relaxation day in between');
    } catch (e) {
      // ignore validation errors for empty days array in mock
    }

    console.log('Captured Scope in Test:', capturedScope);

    assert.ok(capturedScope, 'Scope should be captured.');
    
    // We expect these semantics to hold
    // Let's assert:
    // If the bug is present where it parses as absolute targetDuration = 2, these assertions will fail!
    assert.equal(capturedScope.targetDuration, 7, 'Calculated target duration must be 7 (5 + 2).');
    
    // Restore
    require('../services/providers/ollamaProvider').prototype.reviseItinerary = originalRevise;
    require('../services/providers/geminiProvider').prototype.reviseItinerary = originalRevise;
  });
});
