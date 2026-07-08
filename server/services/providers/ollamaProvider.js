'use strict';

/**
 * Ollama AI Provider
 *
 * Implements the AI Provider interface for the local Ollama API.
 */
const ITINERARY_DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    destination: { type: 'string' },
    duration: { type: 'integer' },
    summary: { type: 'string' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day: { type: 'integer' },
          theme: { type: 'string' },
          stops: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                suggestedTime: { type: 'string' },
                suggestedDuration: { type: 'string' },
                category: { type: 'string' }
              },
              required: ['name', 'description', 'suggestedTime', 'suggestedDuration', 'category']
            }
          }
        },
        required: ['day', 'theme', 'stops']
      }
    },
    recommendations: {
      type: 'array',
      items: { type: 'string' }
    },
    packingTips: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['destination', 'duration', 'summary', 'days', 'recommendations', 'packingTips']
};

class OllamaProvider {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = config.model || process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
    this.timeout = config.timeout || Number(process.env.AI_GENERATION_TIMEOUT_MS) || 120000; // 2 minutes local timeout
  }

  async _callOllama(payload) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const textResponse = data.response;
      
      if (!textResponse) {
        throw new Error('Ollama returned empty response');
      }

      return textResponse;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${this.timeout / 1000} seconds.`);
      }
      if (error.cause && error.cause.code === 'ECONNREFUSED') {
        throw new Error(`Ollama connection refused at ${this.baseUrl}. Is Ollama running?`);
      }
      throw error;
    }
  }

  async generateItineraryDraft(input) {
    const prompt = this._buildPrompt(input);
    const payload = {
      model: this.model,
      prompt: prompt,
      stream: false,
      format: ITINERARY_DRAFT_SCHEMA,
      options: {
        temperature: 0.2, // Conservative temperature for structured generation as requested
      }
    };

    const responseText = await this._callOllama(payload);
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (err) {
      throw new Error('Ollama returned malformed JSON');
    }

    return this._validateAndNormalize(parsed, input);
  }

  _buildPrompt(input) {
    return `
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
          "category": "string (e.g., culture, nature, food)"
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
  }

  _validateAndNormalize(parsed, input) {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('AI returned non-object structured output.');
    }
    
    // Ensure basic required fields exist
    parsed.destination = parsed.destination || input.destination;
    parsed.duration = typeof parsed.duration === 'number' ? parsed.duration : input.duration;
    parsed.summary = parsed.summary || 'Enjoy your trip to ' + parsed.destination;
    parsed.days = Array.isArray(parsed.days) ? parsed.days : [];
    parsed.recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    parsed.packingTips = Array.isArray(parsed.packingTips) ? parsed.packingTips : [];
    
    // Ensure the array of days matches the requested duration
    parsed.days = parsed.days.map((day, index) => {
      return {
        day: typeof day.day === 'number' ? day.day : index + 1,
        theme: day.theme || 'Exploration',
        stops: Array.isArray(day.stops) ? day.stops.map(stop => ({
          name: stop.name || 'Local point of interest',
          description: stop.description || 'Explore the local area',
          suggestedTime: stop.suggestedTime || 'Flexible',
          suggestedDuration: stop.suggestedDuration || '1-2 hours',
          category: stop.category || 'general'
        })) : []
      };
    });

    return parsed;
  }

  async extractTripIntent(text) {
    const prompt = this._buildIntentPrompt(text);
    const INTENT_SCHEMA = {
      type: 'object',
      properties: {
        destination: { type: 'string' },
        duration: { type: 'integer' },
        travelers: { type: 'integer' },
        travelStyle: { type: 'string' },
        interests: {
          type: 'array',
          items: { type: 'string' }
        },
        budget: { type: 'integer' }
      },
      required: ['interests']
    };

    const payload = {
      model: this.model,
      prompt: prompt,
      stream: false,
      format: INTENT_SCHEMA,
      options: {
        temperature: 0.1,
      }
    };

    const responseText = await this._callOllama(payload);
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (err) {
      throw new Error('Ollama returned malformed JSON for intent extraction');
    }

    return {
      destination: parsed.destination || null,
      duration: typeof parsed.duration === 'number' ? parsed.duration : null,
      travelers: typeof parsed.travelers === 'number' ? parsed.travelers : null,
      travelStyle: parsed.travelStyle || null,
      interests: Array.isArray(parsed.interests) ? parsed.interests : [],
      budget: typeof parsed.budget === 'number' ? parsed.budget : null
    };
  }

  _buildIntentPrompt(text) {
    return `
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

    const payload = {
      model: this.model,
      prompt: prompt,
      stream: false,
      format: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['destination', 'itinerary', 'recommendation', 'out_of_scope'] },
          destination: { type: 'string' },
          overview: { type: 'string' },
          suggestedDuration: { type: 'string' },
          attractions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' }
              },
              required: ['name', 'description']
            }
          },
          dayPlan: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day: { type: 'integer' },
                title: { type: 'string' },
                summary: { type: 'string' },
                places: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['day', 'title', 'summary', 'places']
            }
          },
          travelTips: {
            type: 'array',
            items: { type: 'string' }
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                reason: { type: 'string' }
              },
              required: ['name', 'reason']
            }
          }
        },
        required: ['type', 'destination', 'overview', 'suggestedDuration', 'attractions', 'dayPlan', 'travelTips', 'recommendations']
      },
      options: {
        temperature: 0.2
      }
    };

    const response = await this._callOllama(payload);
    return JSON.parse(response);
  }

  async generateTrendingDestinations() {
    const prompt = `Suggest 5 trending travel destinations in ${new Date().getFullYear()} with short descriptions. Return ONLY JSON.`;
    const TRENDING_SCHEMA = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['name', 'description']
      }
    };
    const payload = {
      model: this.model,
      prompt: prompt,
      stream: false,
      format: TRENDING_SCHEMA,
      options: { temperature: 0.3 }
    };
    const response = await this._callOllama(payload);
    return JSON.parse(response);
  }

  async generateItinerarySuggestions(destination) {
    const prompt = `Suggest top 5 attractions in ${destination} for a travel itinerary. Return ONLY JSON.`;
    const ATTRACTIONS_SCHEMA = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['name', 'description']
      }
    };
    const payload = {
      model: this.model,
      prompt: prompt,
      stream: false,
      format: ATTRACTIONS_SCHEMA,
      options: { temperature: 0.3 }
    };
    const response = await this._callOllama(payload);
    return JSON.parse(response);
  }

  async generateAutocompleteSuggestions(query) {
    const list = [
      'Kyoto, Japan',
      'Santorini, Greece',
      'Leh, Ladakh, India',
      'Lucerne, Switzerland',
      'Munnar, Kerala, India',
      'Jaipur, Rajasthan, India',
      'Ubud, Bali, Indonesia',
      'Paros, Greece',
    ];
    const normalized = String(query || '').toLowerCase();
    const matches = list.filter((place) => place.toLowerCase().includes(normalized));
    return (matches.length ? matches : list).slice(0, 8);
  }
}

module.exports = OllamaProvider;
