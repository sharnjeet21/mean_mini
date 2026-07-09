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

function parseScopeDeterministically(instruction, currentDaysCount) {
  const norm = instruction.toLowerCase();
  const targetDays = [];
  const preserveDays = [];
  let scopeType = null;
  let targetDuration = null;
  let allowedFields = [];
  let protectedFields = [];

  // Match "Day X"
  const dayRegex = /\bday\s+(\d+)\b/g;
  let match;
  while ((match = dayRegex.exec(norm)) !== null) {
    const d = parseInt(match[1], 10);
    if (d > 0 && d <= currentDaysCount) {
      targetDays.push(d);
    }
  }

  // Match "first X days"
  const firstDaysRegex = /\bfirst\s+(\d+)\s+days?\b/;
  const firstDaysMatch = norm.match(firstDaysRegex);
  if (firstDaysMatch) {
    const count = parseInt(firstDaysMatch[1], 10);
    for (let i = 1; i <= Math.min(count, currentDaysCount); i++) {
      preserveDays.push(i);
    }
    scopeType = 'structural';
  }

  // Match "do not change Day X" / "preserve Day X"
  const noChangeRegex = /\b(?:do not change|preserve|keep)\s+day\s+(\d+)\b/g;
  while ((match = noChangeRegex.exec(norm)) !== null) {
    const d = parseInt(match[1], 10);
    if (d > 0 && d <= currentDaysCount) {
      preserveDays.push(d);
      if (!targetDays.includes(d)) {
        const idx = targetDays.indexOf(d);
        if (idx !== -1) targetDays.splice(idx, 1);
      }
    }
  }

  // Match "extend to X days" / "make the itinerary X days" / "6 days"
  const durationRegex = /\b(?:extend|duration|make it|total)\s+(?:to\s+)?(\d+)\s+days?\b/;
  const durationMatch = norm.match(durationRegex);
  if (durationMatch) {
    targetDuration = parseInt(durationMatch[1], 10);
    scopeType = 'structural';
  }

  if (norm.includes('budget')) {
    allowedFields.push('budget');
  }
  if (norm.includes('location') || norm.includes('place')) {
    protectedFields.push('location');
  }

  if (targetDays.length > 0 && preserveDays.length === 0) {
    scopeType = 'day_specific';
    for (let i = 1; i <= currentDaysCount; i++) {
      if (!targetDays.includes(i)) {
        preserveDays.push(i);
      }
    }
  }

  return {
    scopeType,
    targetDays,
    preserveDays: [...new Set(preserveDays)],
    allowedFields,
    protectedFields,
    targetDuration,
    intent: instruction
  };
}

function computeRevisionFingerprint(itinerary, instruction, userId = '') {
  const providerName = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
  const modelName = (process.env.OLLAMA_MODEL || 'gemma3:latest').toLowerCase();
  const updatedAtStr = itinerary.updatedAt ? new Date(itinerary.updatedAt).toISOString() : '';
  const version = itinerary.__v !== undefined ? String(itinerary.__v) : '';

  const normalizedString = JSON.stringify({
    userId: String(userId),
    itineraryId: String(itinerary._id),
    updatedAt: updatedAtStr,
    version,
    instruction: String(instruction).trim().toLowerCase(),
    provider: providerName,
    model: modelName
  });

  return crypto.createHash('sha256').update(normalizedString).digest('hex');
}

function mergeAndPreserve(original, revised, scope) {
  const merged = JSON.parse(JSON.stringify(revised));

  if (scope.preserveDays && scope.preserveDays.length > 0) {
    const origDaysMap = new Map();
    (original.dailyPlan || []).forEach(d => {
      origDaysMap.set(d.day, d);
    });

    merged.dailyPlan = (merged.dailyPlan || []).map((dayObj, index) => {
      const dayNum = dayObj.day || (index + 1);
      if (scope.preserveDays.includes(dayNum)) {
        const origDay = origDaysMap.get(dayNum);
        if (origDay) {
          return JSON.parse(JSON.stringify(origDay));
        }
      }
      return dayObj;
    });
  }

  if (scope.protectedFields && scope.protectedFields.length > 0) {
    if (scope.protectedFields.includes('location')) {
      const origDaysMap = new Map();
      (original.dailyPlan || []).forEach(d => {
        origDaysMap.set(d.day, d);
      });

      merged.dailyPlan = (merged.dailyPlan || []).map((dayObj, index) => {
        const dayNum = dayObj.day || (index + 1);
        const origDay = origDaysMap.get(dayNum);
        if (origDay && dayObj.activities && origDay.activities) {
          dayObj.activities = dayObj.activities.map((act, actIndex) => {
            const origAct = origDay.activities[actIndex];
            if (origAct) {
              return {
                ...act,
                location: origAct.location
              };
            }
            return act;
          });
        }
        return dayObj;
      });
    }
  }

  if (scope.protectedFields && scope.protectedFields.includes('budget')) {
    merged.budget = original.budget;
  }
  if (scope.protectedFields && scope.protectedFields.includes('destination')) {
    merged.destination = original.destination;
  }

  if (merged.dailyPlan) {
    merged.dailyPlan.forEach((d, i) => {
      d.day = i + 1;
    });
  }

  return merged;
}

function validateConstrainedCandidate(candidate, original, scope) {
  if (!candidate.destination || String(candidate.destination).trim() === '') {
    throw new Error('Destination is required.');
  }
  if (!candidate.title || String(candidate.title).trim() === '') {
    throw new Error('Title is required.');
  }
  if (candidate.budget !== undefined && candidate.budget < 0) {
    throw new Error('Budget cannot be negative.');
  }

  if (candidate.dailyPlan) {
    if (!Array.isArray(candidate.dailyPlan)) {
      throw new Error('Daily plan must be an array.');
    }
    const dayNumbers = candidate.dailyPlan.map(d => d.day);
    const uniqueDays = new Set(dayNumbers);
    if (uniqueDays.size !== dayNumbers.length) {
      throw new Error('Duplicate day numbers found.');
    }

    for (let i = 0; i < candidate.dailyPlan.length; i++) {
      const day = candidate.dailyPlan[i];
      if (day.day !== i + 1) {
        throw new Error(`Invalid day numbering. Expected Day ${i + 1}, found Day ${day.day}.`);
      }
      if (!day.title || String(day.title).trim() === '') {
        throw new Error(`Day ${day.day} must have a title.`);
      }
      if (day.activities) {
        if (!Array.isArray(day.activities)) {
          throw new Error(`Activities on Day ${day.day} must be an array.`);
        }
        for (let j = 0; j < day.activities.length; j++) {
          const act = day.activities[j];
          if (!act.activity || String(act.activity).trim() === '') {
            throw new Error(`Activity ${j + 1} on Day ${day.day} must have a name.`);
          }
        }
      }
    }
  }

  if (scope.preserveDays && scope.preserveDays.length > 0) {
    const origDaysMap = new Map();
    (original.dailyPlan || []).forEach(d => {
      origDaysMap.set(d.day, JSON.stringify(d));
    });

    for (const dayObj of (candidate.dailyPlan || [])) {
      if (scope.preserveDays.includes(dayObj.day)) {
        const origStr = origDaysMap.get(dayObj.day);
        const candStr = JSON.stringify(dayObj);
        if (origStr && origStr !== candStr) {
          throw new Error(`Preserved Day ${dayObj.day} structure has been modified.`);
        }
      }
    }
  }

  if (scope.protectedFields && scope.protectedFields.includes('location')) {
    const origDaysMap = new Map();
    (original.dailyPlan || []).forEach(d => {
      origDaysMap.set(d.day, d);
    });

    for (const dayObj of (candidate.dailyPlan || [])) {
      const origDay = origDaysMap.get(dayObj.day);
      if (origDay && dayObj.activities && origDay.activities) {
        for (let j = 0; j < Math.min(dayObj.activities.length, origDay.activities.length); j++) {
          if (dayObj.activities[j].location !== origDay.activities[j].location) {
            throw new Error(`Protected location field on Day ${dayObj.day} activity has been modified.`);
          }
        }
      }
    }
  }
}

function shouldBypassAiScope(instruction) {
  const norm = instruction.toLowerCase();
  
  const patterns = [
    /\bday\s+\d+\b/,
    /\bfirst\s+\d+\s+days?\b/,
    /\bextend\s+(?:to\s+)?\d+\s+days?\b/,
    /\bremove\s+(?:the\s+)?(?:last\s+day|day\s+\d+)\b/,
    /\badd\s+(?:one\s+day|day)\b/,
    /\bwithout\s+changing\s+locations?\b/,
    /\bdo\s+not\s+change\s+locations?\b/,
    /\bpreserve\s+locations?\b/,
    /\bdo\s+not\s+change\s+day\b/,
    /\bpreserve\s+day\b/,
    /\bkeep\s+day\b/
  ];

  return patterns.some(pattern => pattern.test(norm));
}

async function extractTripIntent(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Text input is required for intent extraction.');
  }

  const provider = getAiProvider();
  return await provider.extractTripIntent(text.trim());
}

async function reviseItinerary(itinerary, instruction, userId = '') {
  if (!itinerary || typeof itinerary !== 'object') {
    throw new Error('Itinerary is required for revision.');
  }
  if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
    throw new Error('Instruction is required and must be a non-empty string.');
  }

  const durationVal = parseInt(itinerary.duration) || (itinerary.dailyPlan ? itinerary.dailyPlan.length : 1);
  const provider = getAiProvider();

  // 1. Extract Scope (Deterministic + AI)
  const detScope = parseScopeDeterministically(instruction, durationVal);
  let aiScope = { scopeType: 'full_revision', targetDays: [], preserveDays: [], allowedFields: [], protectedFields: [], intent: instruction };
  
  if (shouldBypassAiScope(instruction)) {
    console.log('[itineraryDraftService] Bypassing AI scope extraction for deterministic instruction:', instruction);
  } else {
    try {
      aiScope = await provider.extractRevisionScope(instruction.trim(), durationVal);
    } catch (err) {
      console.warn('[itineraryDraftService] Semantic scope extraction failed, falling back to deterministic scope:', err.message);
    }
  }

  // Merge scopes (giving deterministic checks priority for specific day numbers)
  const mergedScope = {
    scopeType: detScope.scopeType || aiScope.scopeType || 'full_revision',
    targetDays: detScope.targetDays.length > 0 ? detScope.targetDays : (aiScope.targetDays || []),
    preserveDays: detScope.preserveDays.length > 0 ? detScope.preserveDays : (aiScope.preserveDays || []),
    allowedFields: [...new Set([...detScope.allowedFields, ...(aiScope.allowedFields || [])])],
    protectedFields: [...new Set([...detScope.protectedFields, ...(aiScope.protectedFields || [])])],
    targetDuration: detScope.targetDuration || (aiScope.targetDuration || null),
    intent: instruction.trim()
  };

  // If structural duration target exists, make sure allowedFields includes duration
  if (mergedScope.targetDuration) {
    mergedScope.allowedFields.push('duration');
  }

  // 2. Caching & Deduplication Check
  const fingerprint = computeRevisionFingerprint(itinerary, instruction, userId);

  const cached = completedCache.get(fingerprint);
  if (cached && Date.now() <= cached.expiresAt) {
    return {
      ...JSON.parse(JSON.stringify(cached.data)),
      source: 'cache'
    };
  }

  if (activeGenerations.has(fingerprint)) {
    console.log(`[itineraryDraftService] Reusing active in-flight revision for fingerprint: ${fingerprint}`);
    const result = await activeGenerations.get(fingerprint);
    return {
      ...JSON.parse(JSON.stringify(result)),
      source: 'cache'
    };
  }

  const currentData = {
    title: itinerary.title,
    destination: itinerary.destination,
    duration: durationVal,
    budget: itinerary.budget || 0,
    description: itinerary.description || '',
    dailyPlan: (itinerary.dailyPlan || []).map(d => ({
      day: d.day,
      title: d.title,
      activities: (d.activities || []).map(a => ({
        time: a.time || '',
        activity: a.activity || '',
        description: a.description || '',
        location: a.location || '',
        category: a.category || '',
        suggestedDuration: a.suggestedDuration || '',
        whyThisStop: a.whyThisStop || ''
      }))
    })),
    tripSummary: {
      highlights: (itinerary.tripSummary && itinerary.tripSummary.highlights) || []
    }
  };

  // 3. New Revision Generation
  console.log(`[itineraryDraftService] Starting new AI revision for fingerprint: ${fingerprint}`);
  const generationPromise = (async () => {
    // Build revision prompt rules
    const preserveRulesStr = mergedScope.preserveDays.length > 0 
      ? `PROTECTED DAYS — MUST REMAIN SEMANTICALLY AND STRUCTURALLY UNCHANGED:\n` +
        mergedScope.preserveDays.map(d => `Day ${d}: ${JSON.stringify(currentData.dailyPlan.find(day => day.day === d) || {})}`).join('\n')
      : '';
    const editableRulesStr = `EDITABLE CONTENT:\n` +
      `You may modify: ${mergedScope.targetDays.length > 0 ? `Days ${mergedScope.targetDays.join(', ')}` : 'the overall itinerary dailyPlan'}` +
      ` and fields: ${mergedScope.allowedFields.length > 0 ? mergedScope.allowedFields.join(', ') : 'overall metadata'}.`;

    const instructionWithScope = `
${instruction}

Constraint Rules:
${editableRulesStr}
${preserveRulesStr}
`;

    const rawRevised = await provider.reviseItinerary(currentData, instructionWithScope);
    if (!rawRevised || typeof rawRevised !== 'object') {
      throw new Error('Revised itinerary returned by AI is invalid.');
    }

    // 4. Merge server-side
    const mergedCandidate = mergeAndPreserve(itinerary, rawRevised, mergedScope);

    // 5. Backend safety validation
    validateConstrainedCandidate(mergedCandidate, itinerary, mergedScope);

    return mergedCandidate;
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

module.exports = {
  generateItineraryDraft,
  extractTripIntent,
  reviseItinerary
};
