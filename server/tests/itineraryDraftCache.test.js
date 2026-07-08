'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const itineraryDraftService = require('../services/itineraryDraftService');

describe('Itinerary Draft Caching & Deduplication', () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = 'ollama';
    process.env.OLLAMA_MODEL = 'gemma3:latest';
  });

  it('should generate fingerprint successfully and deduplicate concurrent requests', async () => {
    let callCount = 0;
    
    // We mock the resolved provider
    const mockProvider = {
      generateItineraryDraft: async (input) => {
        callCount++;
        // Simulate local model latency
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          destination: input.destination,
          duration: input.duration,
          summary: 'A wonderful custom trip',
          days: [
            { day: 1, theme: 'Arrival', stops: [] }
          ],
          recommendations: [],
          packingTips: []
        };
      }
    };

    const resolver = require('../services/aiProviderResolver');
    const originalGetAiProvider = resolver.getAiProvider;
    resolver.getAiProvider = () => mockProvider;

    try {
      const input = {
        destination: 'Amsterdam',
        duration: 3,
        travelers: 2,
        travelStyle: 'premium',
        interests: ['art', 'food']
      };

      // Run two identical requests concurrently
      const [res1, res2] = await Promise.all([
        itineraryDraftService.generateItineraryDraft(input, 'user123'),
        itineraryDraftService.generateItineraryDraft(input, 'user123')
      ]);

      // Assert only ONE provider call was started/completed
      assert.equal(callCount, 1);
      assert.equal(res1.destination, 'Amsterdam');
      assert.equal(res1.source, 'generated');
      assert.equal(res2.destination, 'Amsterdam');
      assert.equal(res2.source, 'cache');

      // Now query a third time after completion
      const res3 = await itineraryDraftService.generateItineraryDraft(input, 'user123');
      // Should still be 1 total call to provider, resolving from completed cache
      assert.equal(callCount, 1);
      assert.equal(res3.source, 'cache');

    } finally {
      resolver.getAiProvider = originalGetAiProvider;
    }
  });

  it('should isolate caches by userId to prevent leakage', async () => {
    let callCount = 0;
    const mockProvider = {
      generateItineraryDraft: async (input) => {
        callCount++;
        return {
          destination: input.destination,
          duration: input.duration,
          summary: 'Leak proof trip',
          days: [],
          recommendations: [],
          packingTips: []
        };
      }
    };

    const resolver = require('../services/aiProviderResolver');
    const originalGetAiProvider = resolver.getAiProvider;
    resolver.getAiProvider = () => mockProvider;

    try {
      const input = {
        destination: 'Paris',
        duration: 2
      };

      // Query as user1
      const res1 = await itineraryDraftService.generateItineraryDraft(input, 'user1');
      assert.equal(callCount, 1);
      assert.equal(res1.source, 'generated');

      // Query as user2 (same input)
      const res2 = await itineraryDraftService.generateItineraryDraft(input, 'user2');
      // Should generate a NEW request (callCount becomes 2) because userId differs
      assert.equal(callCount, 2);
      assert.equal(res2.source, 'generated');

    } finally {
      resolver.getAiProvider = originalGetAiProvider;
    }
  });

  it('should create different fingerprints for changed duration or interests', async () => {
    let callCount = 0;
    const mockProvider = {
      generateItineraryDraft: async (input) => {
        callCount++;
        return {
          destination: input.destination,
          duration: input.duration,
          summary: 'Varying trip',
          days: [],
          recommendations: [],
          packingTips: []
        };
      }
    };

    const resolver = require('../services/aiProviderResolver');
    const originalGetAiProvider = resolver.getAiProvider;
    resolver.getAiProvider = () => mockProvider;

    try {
      const input1 = { destination: 'Tokyo', duration: 2 };
      const input2 = { destination: 'Tokyo', duration: 5 }; // different duration

      await itineraryDraftService.generateItineraryDraft(input1, 'user123');
      await itineraryDraftService.generateItineraryDraft(input2, 'user123');

      assert.equal(callCount, 2);

    } finally {
      resolver.getAiProvider = originalGetAiProvider;
    }
  });
});
