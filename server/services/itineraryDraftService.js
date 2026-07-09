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

  if (norm.includes('extend') || norm.includes('duration') || norm.includes('total') || norm.includes('make it') || norm.includes('add') || norm.includes('remove')) {
    const durationMatch = norm.match(/\b(\d+)\s+days?\b/);
    if (durationMatch) {
      targetDuration = parseInt(durationMatch[1], 10);
      scopeType = 'structural';
    }
  }

  if (norm.includes('budget')) {
    allowedFields.push('budget');
  }
  if (norm.includes('location') || norm.includes('place')) {
    protectedFields.push('location');
  }

  if (allowedFields.length > 0 && targetDays.length === 0) {
    scopeType = 'global_field';
  } else if (targetDays.length > 0 && preserveDays.length === 0) {
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

function validatePatch(patch, scope, operation) {
  if (!patch || typeof patch !== 'object') {
    throw new Error('Patch is not a valid JSON object.');
  }
  if (patch.operation !== operation) {
    throw new Error(`Patch operation mismatch. Expected "${operation}", got "${patch.operation}".`);
  }

  if (operation === 'replace_day') {
    const targetDay = scope.targetDays[0] || 1;
    if (patch.day !== targetDay) {
      throw new Error(`Patch target day mismatch. Expected Day ${targetDay}, got Day ${patch.day}.`);
    }
    if (!patch.dayData || typeof patch.dayData !== 'object') {
      throw new Error(`Patch is missing "dayData" for replace_day operation.`);
    }
    if (scope.preserveDays.includes(patch.day)) {
      throw new Error(`Patch alters protected Day ${patch.day}.`);
    }
    if (!patch.dayData.title || !Array.isArray(patch.dayData.activities)) {
      throw new Error(`Invalid Day ${patch.day} structure in patch.`);
    }
  } else if (operation === 'replace_days') {
    if (!Array.isArray(patch.days)) {
      throw new Error(`Patch is missing "days" array for replace_days operation.`);
    }
    for (const d of patch.days) {
      if (scope.preserveDays.includes(d.day)) {
        throw new Error(`Patch alters protected Day ${d.day}.`);
      }
      if (!d.day || !d.title || !Array.isArray(d.activities)) {
        throw new Error(`Invalid day structure in replace_days patch.`);
      }
    }
  } else if (operation === 'update_fields') {
    if (!patch.changes || typeof patch.changes !== 'object') {
      throw new Error(`Patch is missing "changes" object for update_fields operation.`);
    }
    if (scope.protectedFields && scope.protectedFields.length > 0) {
      for (const field of scope.protectedFields) {
        if (patch.changes[field] !== undefined) {
          throw new Error(`Patch modifies protected field "${field}".`);
        }
      }
    }
  } else if (operation === 'extend_days') {
    if (!patch.targetDuration || !Array.isArray(patch.days)) {
      throw new Error(`Patch is missing "targetDuration" or "days" for extend_days operation.`);
    }
    if (patch.targetDuration !== scope.targetDuration) {
      throw new Error(`Patch duration mismatch. Expected ${scope.targetDuration}, got ${patch.targetDuration}.`);
    }
    for (const d of patch.days) {
      if (scope.preserveDays.includes(d.day)) {
        throw new Error(`Patch alters protected Day ${d.day}.`);
      }
    }
  }
}

function mergePatch(original, patch, scope, operation) {
  const merged = JSON.parse(JSON.stringify(original));

  if (operation === 'replace_day') {
    const targetDay = patch.day;
    merged.dailyPlan = (merged.dailyPlan || []).map(d => {
      if (d.day === targetDay) {
        return {
          ...patch.dayData,
          day: targetDay
        };
      }
      return d;
    });
  } else if (operation === 'replace_days') {
    const patchDaysMap = new Map();
    patch.days.forEach(d => patchDaysMap.set(d.day, d));

    merged.dailyPlan = (merged.dailyPlan || []).map(d => {
      if (patchDaysMap.has(d.day)) {
        return {
          ...patchDaysMap.get(d.day),
          day: d.day
        };
      }
      return d;
    });
  } else if (operation === 'update_fields') {
    const changes = patch.changes;
    if (changes.budget !== undefined) merged.budget = Number(changes.budget);
    if (changes.estimatedBudget !== undefined) merged.budget = Number(changes.estimatedBudget);
    if (changes.title !== undefined) merged.title = String(changes.title);
    if (changes.description !== undefined) merged.description = String(changes.description);
    if (changes.destination !== undefined) merged.destination = String(changes.destination);
    if (changes.tripSummary && changes.tripSummary.highlights) {
      if (!merged.tripSummary) merged.tripSummary = {};
      merged.tripSummary.highlights = changes.tripSummary.highlights;
    }
  } else if (operation === 'extend_days') {
    merged.duration = patch.targetDuration;
    const newDays = patch.days.filter(d => !scope.preserveDays.includes(d.day));
    merged.dailyPlan = [...(merged.dailyPlan || []), ...newDays];
  }

  // Preserve location field if protected
  if (scope.protectedFields && scope.protectedFields.includes('location')) {
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

  if (merged.dailyPlan) {
    merged.dailyPlan.forEach((d, index) => {
      d.day = index + 1;
    });
  }

  return merged;
}



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

  // Determine Operation
  let operation = 'replace_days';
  if (mergedScope.scopeType === 'day_specific') {
    operation = 'replace_day';
  } else if (mergedScope.scopeType === 'multi_day') {
    operation = 'replace_days';
  } else if (mergedScope.scopeType === 'global_field') {
    operation = 'update_fields';
  } else if (mergedScope.scopeType === 'structural') {
    operation = 'extend_days';
  }

  // 3. New Revision Generation
  console.log(`[itineraryDraftService] Starting new AI revision for fingerprint: ${fingerprint}`);
  const generationPromise = (async () => {
    // Build character count metrics
    let editableInput = '';
    let compactContext = '';

    if (operation === 'replace_day') {
      const targetDayNum = mergedScope.targetDays[0] || 1;
      const targetDay = currentData.dailyPlan.find(d => d.day === targetDayNum) || {};
      editableInput = `EDITABLE DAY ${targetDayNum} CONTENT:\n${JSON.stringify(targetDay, null, 2)}`;
      compactContext = `COMPACT TRIP CONTEXT:\n- Destination: ${currentData.destination}\n- Title: ${currentData.title}\n- Duration: ${currentData.duration} days\n- Budget: ${currentData.budget}`;
    } else if (operation === 'replace_days') {
      const targetDays = currentData.dailyPlan.filter(d => mergedScope.targetDays.includes(d.day));
      editableInput = `EDITABLE DAYS CONTENT:\n${JSON.stringify(targetDays, null, 2)}`;
      compactContext = `COMPACT TRIP CONTEXT:\n- Destination: ${currentData.destination}\n- Title: ${currentData.title}\n- Duration: ${currentData.duration} days\n- Budget: ${currentData.budget}`;
    } else if (operation === 'update_fields') {
      editableInput = `EDITABLE METADATA FIELDS:\n- budget: ${currentData.budget}\n- title: ${currentData.title}\n- description: ${currentData.description}\n- highlights: ${JSON.stringify(currentData.tripSummary?.highlights || [])}`;
      compactContext = `COMPACT TRIP CONTEXT:\n- Destination: ${currentData.destination}\n- Duration: ${currentData.duration} days`;
    } else if (operation === 'extend_days') {
      editableInput = `DURATION CHANGE DETAILS:\n- Current Duration: ${currentData.duration} days\n- Target Duration: ${mergedScope.targetDuration} days`;
      compactContext = `COMPACT TRIP CONTEXT:\n- Destination: ${currentData.destination}\n- Title: ${currentData.title}\n- Budget: ${currentData.budget}`;
    }

    const editInputCharCount = editableInput.length;
    const compactContextCharCount = compactContext.length;
    const promptOverhead = 1200;
    const totalPromptCharCount = editInputCharCount + compactContextCharCount + promptOverhead;

    const startGen = Date.now();
    const patch = await provider.reviseItinerary(currentData, instruction, mergedScope, operation);
    const genTime = ((Date.now() - startGen) / 1000).toFixed(2);

    let patchValidationResult = 'SUCCESS';
    try {
      validatePatch(patch, mergedScope, operation);
    } catch (e) {
      patchValidationResult = `FAILED: ${e.message}`;
      throw e;
    }

    console.log(`[TARGETED PATCH REVISION METRICS]`);
    console.log(`- Revision Operation: ${operation}`);
    console.log(`- Target Day Count: ${mergedScope.targetDays.length}`);
    console.log(`- Editable Input Size: ${editInputCharCount} chars`);
    console.log(`- Compact Context Size: ${compactContextCharCount} chars`);
    console.log(`- Total Prompt Size: ${totalPromptCharCount} chars`);
    console.log(`- Generation Time: ${genTime}s`);
    console.log(`- Patch Validation Result: ${patchValidationResult}`);

    // 4. Merge server-side
    const mergedCandidate = mergePatch(itinerary, patch, mergedScope, operation);

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
