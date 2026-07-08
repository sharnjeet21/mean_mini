'use strict';

const { getAiProvider } = require('./aiProviderResolver');

/**
 * Service to handle the generation of an itinerary draft.
 */
async function generateItineraryDraft(input) {
  // Input validation
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid input provided for itinerary draft.');
  }
  
  if (!input.destination || typeof input.destination !== 'string' || !input.destination.trim()) {
    throw new Error('Destination is required and must be a non-empty string.');
  }
  
  const duration = Number(input.duration);
  if (!Number.isInteger(duration) || duration < 1 || duration > 30) {
    throw new Error('Duration must be a positive integer between 1 and 30.');
  }

  const sanitizedInput = {
    destination: input.destination.trim(),
    duration: duration,
    travelers: input.travelers ? Math.max(1, Number(input.travelers)) : undefined,
    travelStyle: input.travelStyle ? String(input.travelStyle).trim() : 'balanced',
    interests: Array.isArray(input.interests) ? input.interests.map(i => String(i).trim()) : [],
    budget: input.budget ? Math.max(0, Number(input.budget)) : undefined
  };

  // Get the configured AI provider
  const provider = getAiProvider();

  // Generate the draft
  return await provider.generateItineraryDraft(sanitizedInput);
}

async function extractTripIntent(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Text input is required for intent extraction.');
  }

  const provider = getAiProvider();
  return await provider.extractTripIntent(text.trim());
}

module.exports = {
  generateItineraryDraft,
  extractTripIntent
};
