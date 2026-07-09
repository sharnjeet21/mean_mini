'use strict';

/**
 * Gemini AI Provider
 *
 * Implements the AI Provider interface using Google's Gemini REST API.
 */
class GeminiProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.model = config.model || 'gemini-2.5-flash';
    this.timeout = config.timeout || 60000; // 60 seconds default timeout for cloud API
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

  async generateItineraryDraft(input) {
    let attractionsPrompt = '';
    if (input.destinationAttractions && input.destinationAttractions.length > 0) {
      attractionsPrompt = `
Here are some popular signature/recommended places in ${input.destination} that you can select from if they fit the user's prompt, duration, budget, travelStyle, and interests:
${input.destinationAttractions.map(a => `- ${a.name}: ${a.description}`).join('\n')}

Do NOT blindly include all of them. Only select and prioritize the ones that match the user's specific context (e.g. arts vs relaxation, budget, etc.).
`;
    }

    const prompt = `
You are a highly capable travel planning assistant. Your task is to generate a structured itinerary draft.
You MUST output ONLY valid JSON using the exact schema below. Do not include markdown code blocks, just raw JSON.

Output JSON Schema:
{
  "destination": "string (the full destination name)",
  "duration": "number (the exact number of days requested)",
  "summary": "string (a concise trip overview)",
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
  "recommendations": ["string"],
  "packingTips": ["string"]
}

Input Parameters:
- Destination: ${input.destination}
- Duration: ${input.duration} days
- Travelers: ${input.travelers || 'Not specified'}
- Travel Style: ${input.travelStyle || 'balanced'}
- Interests: ${input.interests && input.interests.length > 0 ? input.interests.join(', ') : 'general'}
- Budget: ${input.budget ? input.budget : 'Not specified'}
${attractionsPrompt}
Generation Rules:
- You must generate EXACTLY ${input.duration} days.
- Each day must have a meaningful theme.
- Include destination-relevant places. Do not use generic placeholders like just "Sightseeing" or "Museum".
- Vary activities across the days.
- Do NOT repeat the same stop across multiple days unless repetition is logically justified.
- Consider the interests, travel style, and budget (if provided) when recommending stops and pacing.
- The daily activity count should be realistic and well-sequenced within a day.
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

  async reviseItinerary(currentData, instruction) {
    const prompt = `
You are an expert travel assistant. Your task is to revise an existing travel itinerary based on a user's instruction.
You MUST output ONLY valid JSON using the exact schema below. Do not include markdown code blocks, just raw JSON.

Current Itinerary:
${JSON.stringify(currentData, null, 2)}

User edit instruction:
"${instruction}"

Output JSON Schema:
{
  "title": "string",
  "destination": "string",
  "duration": "integer",
  "budget": "integer",
  "description": "string",
  "dailyPlan": [
    {
      "day": "integer",
      "title": "string",
      "activities": [
        {
          "time": "string",
          "activity": "string",
          "description": "string",
          "location": "string"
        }
      ]
    }
  ],
  "tripSummary": {
    "highlights": ["string"]
  }
}

Revision Rules:
- Preserve itinerary content unrelated to the requested change.
- Modify only what is reasonably required.
- Avoid duplicate stops.
- Avoid generic placeholder activities such as "Sightseeing" or "Museum". Be specific.
- Preserve destination relevance.
- Maintain the required structured itinerary schema.
- Do not silently invent live prices, hotel availability, flight availability, or exact travel times.
- Ensure duration (number of days) matches the count of daily plans.
`;

    const text = await this._callGemini(prompt);
    const cleaned = this._cleanJson(text);
    return JSON.parse(cleaned);
  }
}

module.exports = GeminiProvider;
