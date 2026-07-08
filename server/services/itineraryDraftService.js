const crypto = require('crypto');
const { getAiProvider } = require('./aiProviderResolver');

// Active generations registry: fingerprint -> Promise
const activeGenerations = new Map();

// Completed result cache: fingerprint -> { data, expiresAt }
const completedCache = new Map();

function getCacheTTL() {
  const envTTL = process.env.AI_GENERATION_CACHE_TTL_MS;
  if (envTTL) {
    const parsed = parseInt(envTTL, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 15 * 60 * 1000; // default 15 minutes
}

// Clean up expired cache entries
function cleanupExpiredCache() {
  const now = Date.now();
  for (const [fingerprint, entry] of completedCache.entries()) {
    if (now > entry.expiresAt) {
      completedCache.delete(fingerprint);
    }
  }
}
setInterval(cleanupExpiredCache, 60000);

function computeFingerprint(input, userId = '') {
  const dest = String(input.destination || '').trim().toLowerCase();
  const dur = Number(input.duration) || 0;
  const travelers = input.travelers ? Math.max(1, Number(input.travelers)) : '';
  const travelStyle = String(input.travelStyle || 'balanced').trim().toLowerCase();
  
  const rawInterests = Array.isArray(input.interests) ? input.interests : [];
  const interests = [...new Set(rawInterests.map(i => String(i).trim().toLowerCase()))].sort();
  
  const budget = input.budget ? Math.max(0, Number(input.budget)) : '';
  const prompt = String(input.prompt || input.userPrompt || '').trim().toLowerCase();
  
  const providerName = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
  const modelName = (process.env.OLLAMA_MODEL || 'gemma3:latest').toLowerCase();

  const normalizedString = JSON.stringify({
    userId: String(userId),
    destination: dest,
    duration: dur,
    travelers,
    travelStyle,
    interests,
    budget,
    prompt,
    provider: providerName,
    model: modelName
  });

  return crypto.createHash('sha256').update(normalizedString).digest('hex');
}

/**
 * Service to handle the generation of an itinerary draft.
 */
async function generateItineraryDraft(input, userId = '') {
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
    budget: input.budget ? Math.max(0, Number(input.budget)) : undefined,
    destinationAttractions: Array.isArray(input.destinationAttractions) ? input.destinationAttractions : undefined
  };

  const fingerprint = computeFingerprint(sanitizedInput, userId);

  // 1. Check completed cache
  const cached = completedCache.get(fingerprint);
  if (cached && Date.now() <= cached.expiresAt) {
    return {
      ...JSON.parse(JSON.stringify(cached.data)),
      source: 'cache'
    };
  }

  // 2. Check active in-flight generations
  if (activeGenerations.has(fingerprint)) {
    console.log(`[itineraryDraftService] Reusing active in-flight generation for fingerprint: ${fingerprint}`);
    const result = await activeGenerations.get(fingerprint);
    return {
      ...JSON.parse(JSON.stringify(result)),
      source: 'cache'
    };
  }

  // 3. Start a new generation
  console.log(`[itineraryDraftService] Starting new Ollama/Gemini generation for fingerprint: ${fingerprint}`);
  const generationPromise = (async () => {
    const provider = getAiProvider();
    const result = await provider.generateItineraryDraft(sanitizedInput);
    
    if (!result || typeof result !== 'object' || !result.destination || !result.days) {
      throw new Error('Generated draft failed basic schema validation.');
    }
    
    return result;
  })();

  activeGenerations.set(fingerprint, generationPromise);

  try {
    const result = await generationPromise;
    completedCache.set(fingerprint, {
      data: result,
      expiresAt: Date.now() + getCacheTTL()
    });
    return {
      ...JSON.parse(JSON.stringify(result)),
      source: 'generated'
    };
  } finally {
    activeGenerations.delete(fingerprint);
  }
}

async function extractTripIntent(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Text input is required for intent extraction.');
  }

  const provider = getAiProvider();
  return await provider.extractTripIntent(text.trim());
}

async function reviseItinerary(itinerary, instruction) {
  if (!itinerary || typeof itinerary !== 'object') {
    throw new Error('Itinerary is required for revision.');
  }
  if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
    throw new Error('Instruction is required and must be a non-empty string.');
  }

  const currentData = {
    title: itinerary.title,
    destination: itinerary.destination,
    duration: parseInt(itinerary.duration) || 1,
    budget: itinerary.budget || 0,
    description: itinerary.description || '',
    dailyPlan: (itinerary.dailyPlan || []).map(d => ({
      day: d.day,
      title: d.title,
      activities: (d.activities || []).map(a => ({
        time: a.time || '',
        activity: a.activity || '',
        description: a.description || '',
        location: a.location || ''
      }))
    })),
    tripSummary: {
      highlights: (itinerary.tripSummary && itinerary.tripSummary.highlights) || []
    }
  };

  const provider = getAiProvider();
  return await provider.reviseItinerary(currentData, instruction.trim());
}

module.exports = {
  generateItineraryDraft,
  extractTripIntent,
  reviseItinerary
};
