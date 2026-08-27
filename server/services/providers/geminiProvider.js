'use strict';

/**
 * Gemini AI Provider
 *
 * Implements the AI Provider interface using Google's Gemini REST API.
 */
class GeminiProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.model = config.model || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    this.timeout = config.timeout || 60000; // 60 seconds default timeout for cloud API
  }

  async isAvailable() {
    return !!this.apiKey;
  }

  async _callGemini(prompt) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || `Gemini request failed with status ${response.status}`);
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini returned an empty response');
      }

      return text;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Gemini request timed out after ${this.timeout / 1000} seconds.`);
      }
      throw error;
    }
  }

  _cleanJson(text) {
    return text.replace(/```(?:json)?\n?/gi, '').trim();
  }

  async estimateBudget({ destination, duration, travelerCount, travelStyle, userBudget }) {
    const prompt = `
You are a travel budget analyst. Estimate the total trip cost in USD.
Return ONLY valid JSON, no markdown.

Output schema:
{
  "totalEstimated": number,
  "costLevel": "budget" | "moderate" | "expensive",
  "breakdown": {
    "transport": number,
    "accommodation": number,
    "food": number,
    "activities": number,
    "miscellaneous": number
  },
  "tips": ["string"]
}

Trip parameters:
- Destination: ${destination}
- Duration: ${duration} days
- Travelers: ${travelerCount || 1}
- Travel style: ${travelStyle || 'balanced'}
- User budget (USD): ${userBudget || 'not specified'}

Rules:
- totalEstimated is the realistic total for ALL travelers combined.
- Use USD. Be realistic for the destination cost level.
- Do NOT wrap in \`\`\`json. Start directly with {.
`;
    const text = await this._callGemini(prompt);
    const cleaned = this._cleanJson(text);
    const parsed = JSON.parse(cleaned);
    return {
      totalEstimated: Number(parsed.totalEstimated) || 0,
      costLevel: parsed.costLevel || 'moderate',
      breakdown: parsed.breakdown || {},
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
    };
  }

  async generateItineraryDraft(input) {
    let attractionsPrompt = '';
    if (input.destinationAttractions && input.destinationAttractions.length > 0) {
      attractionsPrompt = `
Here are some popular signature/recommended places in ${input.destination} that you can select from if they fit the user's prompt, duration, budget, travelStyle, and interests:
${input.destinationAttractions.map(a => `- ${a.name}: ${a.description}`).join('\n')}

Do NOT blindly include all of them. Only select and prioritize the ones that match the user's specific context (e.g. arts vs relaxation, budget, etc.).
`;
    }
    let budgetString = 'Not specified';
    if (input.budget === null) {
      budgetString = 'The traveler has no fixed budget. Recommend the best suitable accommodation, transport and activities. Do not attempt to minimize cost.';
    } else if (input.budget !== undefined) {
      budgetString = input.budget;
    }

    const prompt = `
You are a highly capable travel planning assistant. Your task is to generate a structured itinerary draft.
You MUST output ONLY valid JSON using the exact schema below. Do not include markdown code blocks, just raw JSON.

Output JSON Schema:
{
  "destination": "string (the full destination name)",
  "duration": "number (the exact number of days requested)",
  "summary": "string (a useful overall description)",
  "days": [
    {
      "day": "number (e.g., 1)",
      "theme": "string (meaningful day theme)",
      "stops": [
        {
          "name": "string (specific place name)",
          "description": "string (short useful description)",
          "suggestedTime": "string (e.g., 10:00)",
          "suggestedDuration": "string (e.g., 2 hours)",
          "category": "string (e.g., culture, nature, food)",
          "whyThisStop": "string (why this stop matches user interests or style)"
        }
      ]
    }
  ],
  "recommendations": ["string (include local recommendations and practical travel advice)"],
  "packingTips": ["string"]
}

Input Parameters:
- Destination: ${input.destination} (Do NOT hardcode destinations; adapt to this destination)
- Duration: ${input.duration} days
- Travelers: ${input.travelers || 'Not specified'}
- Travel Style: ${input.travelStyle || 'balanced'}
- Interests: ${input.interests && input.interests.length > 0 ? input.interests.join(', ') : 'general'}
- Budget: ${budgetString}
${attractionsPrompt}
Generation Rules to Maximize Trip Intelligence Metrics:
1. Completeness: Every single day must be planned up to ${input.duration} days. Provide meaningful themes, detailed descriptions, and highlight-worthy stops.
2. Feasibility: Ensure a realistic travel sequence. Avoid impossible schedules or excessive travel times between stops.
3. Pace: Keep a balanced number of activities per day. Avoid overloaded days and avoid empty days.
4. Budget: Suggest realistic accommodation, transport, meals, and attraction costs that fit the Budget parameter (including contingency).
5. Sustainability: Prefer nearby attractions to reduce unnecessary transport, and encourage walking or public transport when appropriate.

Additional Guidelines:
- Avoid repeating the same structure every day; make every day feel unique.
- Do NOT repeat the same stop across multiple days unless logically justified.
- Include practical travel advice and local recommendations.
- Produce a useful overall description.
- Do NOT include live hotel availability, live flight/ticket prices, or live route conditions.
- Do NOT wrap your response in \`\`\`json or \`\`\`. Start directly with {.
`;

    const text = await this._callGemini(prompt);
    const cleaned = this._cleanJson(text);
    const parsed = JSON.parse(cleaned);

    // Validate and normalize
    parsed.destination = parsed.destination || input.destination;
    parsed.duration = typeof parsed.duration === 'number' ? parsed.duration : input.duration;
    parsed.summary = parsed.summary || 'Enjoy your trip to ' + parsed.destination;
    parsed.days = Array.isArray(parsed.days) ? parsed.days : [];
    parsed.recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    parsed.packingTips = Array.isArray(parsed.packingTips) ? parsed.packingTips : [];

    parsed.days = parsed.days.map((day, index) => ({
      day: typeof day.day === 'number' ? day.day : index + 1,
      theme: day.theme || 'Exploration',
      stops: Array.isArray(day.stops) ? day.stops.map(stop => ({
        name: stop.name || 'Local point of interest',
        description: stop.description || 'Explore the local area',
        suggestedTime: stop.suggestedTime || 'Flexible',
        suggestedDuration: stop.suggestedDuration || '1-2 hours',
        category: stop.category || 'general',
        whyThisStop: stop.whyThisStop || stop.reason || ''
      })) : []
    }));

    return parsed;
  }

  async extractTripIntent(text) {
    const prompt = `
You are an expert travel assistant. Your task is to extract structured travel planning parameters from the user's natural language request.
You MUST output ONLY valid JSON using the exact schema below. Do not include markdown code blocks, just raw JSON.

Output JSON Schema:
{
  "destination": "string (the destination city/region, or omit if not found)",
  "duration": "integer (number of days, e.g. 4 for '4-day trip', or omit if not found)",
  "travelers": "integer (number of people, e.g. 3 for '3 people', 1 for 'solo', or omit if not found)",
  "travelStyle": "string (one of: 'budget', 'balanced', 'premium', or omit if not found)",
  "interests": ["string"] (array of interests, e.g. ['nature', 'adventure'], or empty array if not found),
  "budget": "integer (total budget amount, e.g. 30000, or omit if not found)"
}

Input Text: "${text}"

Extraction Rules:
- Only extract what is explicitly or strongly implied in the text.
- Do not invent values if they are not in the text; omit those keys or set them to null.
- If duration is a range, pick the maximum number.
- Do NOT wrap your response in \`\`\`json or \`\`\`. Start directly with {.
`;

    const resText = await this._callGemini(prompt);
    const cleaned = this._cleanJson(resText);
    const parsed = JSON.parse(cleaned);

    return {
      destination: parsed.destination || null,
      duration: typeof parsed.duration === 'number' ? parsed.duration : null,
      travelers: typeof parsed.travelers === 'number' ? parsed.travelers : null,
      travelStyle: parsed.travelStyle || null,
      interests: Array.isArray(parsed.interests) ? parsed.interests : [],
      budget: typeof parsed.budget === 'number' ? parsed.budget : null
    };
  }

  async generateStructuredTravelSearch(query) {
    const prompt = `
You are a travel planning assistant.
You MUST output ONLY valid JSON matching the exact schema below. Do not include markdown code blocks, just raw JSON.

Output JSON Schema:
{
  "type": "string (one of: 'destination', 'itinerary', 'recommendation', 'out_of_scope')",
  "destination": "string",
  "overview": "string",
  "suggestedDuration": "string",
  "attractions": [
    {
      "name": "string",
      "description": "string"
    }
  ],
  "dayPlan": [
    {
      "day": "integer",
      "title": "string",
      "summary": "string",
      "places": ["string"]
    }
  ],
  "travelTips": ["string"],
  "recommendations": [
    {
      "name": "string",
      "reason": "string"
    }
  ]
}

Rules:
- Only answer travel-related queries.
- If the query is outside travel, set type to "out_of_scope".
- For type="destination", include destination, overview, suggestedDuration, attractions, and travelTips.
- For type="itinerary", include destination, overview, suggestedDuration, attractions, dayPlan, and travelTips.
- For type="recommendation", include recommendations.
- Keep answers concise and practical.

User query: ${query}
`;

    const text = await this._callGemini(prompt);
    const cleaned = this._cleanJson(text);
    return JSON.parse(cleaned);
  }

  async generateTrendingDestinations() {
    const prompt = `Suggest 5 trending travel destinations in ${new Date().getFullYear()} with short descriptions. Return ONLY a JSON array of objects with fields name (string) and description (string, max 100 chars), no markdown.`;
    const text = await this._callGemini(prompt);
    const cleaned = this._cleanJson(text);
    return JSON.parse(cleaned);
  }

  async generateItinerarySuggestions(destination) {
    const prompt = `Suggest top 5 attractions in ${destination} for a travel itinerary. Return ONLY a JSON array of objects with fields name (string) and description (string, max 150 chars), no markdown.`;
    const text = await this._callGemini(prompt);
    const cleaned = this._cleanJson(text);
    return JSON.parse(cleaned);
  }

  async generateAutocompleteSuggestions(query) {
    const prompt = `Suggest up to 8 real place names matching '${query}'. Return ONLY a JSON array of strings, no markdown.`;
    const text = await this._callGemini(prompt);
    const cleaned = this._cleanJson(text);
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
      : [];
  }

  async extractRevisionScope(instruction, duration) {
    const prompt = `
You are a travel assistant. Analyze the user's travel itinerary edit instruction and extract the revision scope.
You MUST output ONLY valid JSON using the exact schema below. Do not include markdown code blocks, just raw JSON.

Output JSON Schema:
{
  "scopeType": "day_specific | multi_day | global_field | structural | full_revision",
  "targetDays": [1, 2, 3],
  "preserveDays": [4, 5],
  "allowedFields": ["string"],
  "protectedFields": ["string"],
  "intent": "brief description of the change intent"
}

Rules:
- duration = ${duration} (total days currently).
- targetDays: Day numbers user wants to modify.
- preserveDays: Day numbers user explicitly or implicitly wants to keep unchanged. If user says "Only make Day 3 more adventurous", targetDays is [3] and preserveDays is all other day numbers.
- scopeType:
  * "day_specific": changes apply to one specific day.
  * "multi_day": changes apply to multiple specific days but not all.
  * "global_field": changes apply to overall trip fields like budget, title, description, traveler count but not daily plans.
  * "structural": changes the number of days (duration) or adds/removes days.
  * "full_revision": a broad edit that might affect any or all parts.

User Edit Instruction: "${instruction}"
`;

    const text = await this._callGemini(prompt);
    const cleaned = this._cleanJson(text);
    const parsed = JSON.parse(cleaned);

    return {
      scopeType: parsed.scopeType || 'full_revision',
      targetDays: Array.isArray(parsed.targetDays) ? parsed.targetDays : [],
      preserveDays: Array.isArray(parsed.preserveDays) ? parsed.preserveDays : [],
      allowedFields: Array.isArray(parsed.allowedFields) ? parsed.allowedFields : [],
      protectedFields: Array.isArray(parsed.protectedFields) ? parsed.protectedFields : [],
      intent: parsed.intent || ''
    };
  }

  async reviseItinerary(currentData, instruction, scope, operation) {
    let editableInput = '';
    let compactContext = '';

    if (operation === 'replace_day') {
      const targetDayNum = scope.targetDays[0] || 1;
      const targetDay = currentData.dailyPlan.find(d => d.day === targetDayNum) || {};
      editableInput = `EDITABLE DAY ${targetDayNum} CONTENT:\n${JSON.stringify(targetDay, null, 2)}`;
      compactContext = `COMPACT TRIP CONTEXT:\n- Destination: ${currentData.destination}\n- Title: ${currentData.title}\n- Duration: ${currentData.duration} days\n- Budget: ${currentData.budget}`;
    } else if (operation === 'replace_days') {
      const targetDays = currentData.dailyPlan.filter(d => scope.targetDays.includes(d.day));
      editableInput = `EDITABLE DAYS CONTENT:\n${JSON.stringify(targetDays, null, 2)}`;
      compactContext = `COMPACT TRIP CONTEXT:\n- Destination: ${currentData.destination}\n- Title: ${currentData.title}\n- Duration: ${currentData.duration} days\n- Budget: ${currentData.budget}`;
    } else if (operation === 'update_fields') {
      editableInput = `EDITABLE METADATA FIELDS:\n- budget: ${currentData.budget}\n- title: ${currentData.title}\n- description: ${currentData.description}\n- highlights: ${JSON.stringify(currentData.tripSummary?.highlights || [])}`;
      compactContext = `COMPACT TRIP CONTEXT:\n- Destination: ${currentData.destination}\n- Duration: ${currentData.duration} days`;
    } else if (operation === 'extend_days') {
      editableInput = `DURATION CHANGE DETAILS:\n- Current Duration: ${currentData.duration} days\n- Target Duration: ${scope.targetDuration} days`;
      compactContext = `COMPACT TRIP CONTEXT:\n- Destination: ${currentData.destination}\n- Title: ${currentData.title}\n- Budget: ${currentData.budget}`;
    } else {
      editableInput = JSON.stringify(currentData, null, 2);
    }

    const prompt = `
You are an expert travel assistant. Your task is to revise an existing travel itinerary based on a user's instruction.
Instead of rewriting the entire itinerary, you MUST generate a targeted PATCH JSON matching the exact schema below.

Output JSON Schema:
{
  "operation": "${operation}",
  ${operation === 'replace_day' ? `"day": Number,\n  "dayData": { "day": Number, "title": "string", "activities": [{ "time": "string", "activity": "string", "description": "string", "location": "string" }] }` : ''}
  ${operation === 'replace_days' ? `"days": [{ "day": Number, "title": "string", "activities": [{ "time": "string", "activity": "string", "description": "string", "location": "string" }] }]` : ''}
  ${operation === 'update_fields' ? `"changes": { "budget": Number, "title": "string", "description": "string", "tripSummary": { "highlights": ["string"] } }` : ''}
  ${operation === 'extend_days' ? `"targetDuration": Number,\n  "days": [{ "day": Number, "title": "string", "activities": [{ "time": "string", "activity": "string", "description": "string", "location": "string" }] }] (ONLY generate the newly added day objects, e.g. Days ${(currentData.duration + 1)} to ${(scope.targetDuration || currentData.duration)})` : ''}
}

Constraint Rules:
- Only generate data required for the operation "${operation}".
- Do NOT include any unmodified/preserved days in your output.
- Do NOT wrap your response in markdown code blocks. Start directly with the JSON object.

User Edit Instruction:
"${instruction}"

${compactContext}

${editableInput}
`;

    const text = await this._callGemini(prompt);
    const cleaned = this._cleanJson(text);
    return JSON.parse(cleaned);
  }
}

module.exports = GeminiProvider;
