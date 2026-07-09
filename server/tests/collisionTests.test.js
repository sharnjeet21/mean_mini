'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const itineraryDraftService = require('../services/itineraryDraftService');

describe('Compound Duration and Keyword Collision Tests', () => {
  const getItinerary5 = () => ({
    _id: '507f1f77bcf86cd799439011',
    title: 'Trip',
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
  });

  const runParse = (instruction) => {
    const originalReviseOllama = require('../services/providers/ollamaProvider').prototype.reviseItinerary;
    const originalReviseGemini = require('../services/providers/geminiProvider').prototype.reviseItinerary;
    let captured = null;
    
    require('../services/providers/ollamaProvider').prototype.reviseItinerary = async function(data, inst, scope) {
      captured = scope;
      return { operation: 'replace_days', days: [] };
    };
    require('../services/providers/geminiProvider').prototype.reviseItinerary = async function(data, inst, scope) {
      captured = scope;
      return { operation: 'replace_days', days: [] };
    };
    
    return itineraryDraftService.reviseItinerary(getItinerary5(), instruction)
      .catch(() => {})
      .then(() => {
        require('../services/providers/ollamaProvider').prototype.reviseItinerary = originalReviseOllama;
        require('../services/providers/geminiProvider').prototype.reviseItinerary = originalReviseGemini;
        return captured;
      });
  };

  it('Case 1: "add 2 days and also add a relaxation day in between" -> 7 relative', async () => {
    const scope = await runParse("add 2 days and also add a relaxation day in between");
    assert.ok(scope);
    assert.equal(scope.scopeType, 'structural');
    assert.equal(scope.targetDuration, 7);
  });

  it('Case 2: "add 2 days and make the last day relaxing" -> 7 relative', async () => {
    const scope = await runParse("add 2 days and make the last day relaxing");
    assert.ok(scope);
    assert.equal(scope.scopeType, 'structural');
    assert.equal(scope.targetDuration, 7);
  });

  it('Case 3: "extend by 2 days and make day 6 a rest day" -> 7 relative', async () => {
    const scope = await runParse("extend by 2 days and make day 6 a rest day");
    assert.ok(scope);
    assert.equal(scope.scopeType, 'structural');
    assert.equal(scope.targetDuration, 7);
  });

  it('Case 4: "extend to 7 days and add more relaxation" -> 7 absolute', async () => {
    const scope = await runParse("extend to 7 days and add more relaxation");
    assert.ok(scope);
    assert.equal(scope.scopeType, 'structural');
    assert.equal(scope.targetDuration, 7);
  });

  it('Case 5: "make it 7 days and add a relaxation day" -> 7 absolute', async () => {
    const scope = await runParse("make it 7 days and add a relaxation day");
    assert.ok(scope);
    assert.equal(scope.scopeType, 'structural');
    assert.equal(scope.targetDuration, 7);
  });

  it('Case 6: "add a relaxation day" -> Must NOT infer numeric targetDuration from the word "day"', async () => {
    const scope = await runParse("add a relaxation day");
    assert.ok(scope);
    assert.notEqual(scope.scopeType, 'structural');
    assert.equal(scope.targetDuration, null);
  });

  it('Case 7: "make day 2 relaxing" -> Must NOT interpret Day 2 as trip duration = 2', async () => {
    const scope = await runParse("make day 2 relaxing");
    assert.ok(scope);
    assert.notEqual(scope.scopeType, 'structural');
    assert.equal(scope.targetDuration, null);
  });

  it('Case 8: "replace day 3 with a relaxation day" -> Must NOT interpret Day 3 as trip duration = 3', async () => {
    const scope = await runParse("replace day 3 with a relaxation day");
    assert.ok(scope);
    assert.notEqual(scope.scopeType, 'structural');
    assert.equal(scope.targetDuration, null);
  });
});
