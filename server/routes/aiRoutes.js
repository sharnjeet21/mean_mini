/**
 * AI Travel Enhancement Routes
 *
 * Endpoints:
 *   GET /image                  — Unsplash destination image
 *   GET /suggestions            — Gemini AI place autocomplete
 *   GET /trending               — Gemini AI trending destinations
 *   GET /itinerary-suggestions  — Gemini AI attraction suggestions
 *
 * All routes use rateLimiter middleware.
 * Query-param routes also use validateQueryParam middleware.
 * Results are cached in-memory to reduce external API calls.
 */

const express = require('express');
const { rateLimiter } = require('../middleware/rateLimiter');
const { validateQueryParam } = require('../middleware/inputValidator');
const { InMemoryCache } = require('../utils/inMemoryCache');

const router = express.Router();

// ── Environment variables ─────────────────────────────────────────────────────
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!UNSPLASH_ACCESS_KEY) {
  console.warn('[aiRoutes] WARNING: UNSPLASH_ACCESS_KEY is not set. /api/image will not work.');
}
if (!GEMINI_API_KEY) {
  console.warn('[aiRoutes] WARNING: GEMINI_API_KEY is not set. Gemini-powered routes will not work.');
}

// ── Cache instances ───────────────────────────────────────────────────────────
const ONE_HOUR_MS = 3_600_000;
const TWENTY_FOUR_HOURS_MS = 86_400_000;

const imageCache = new InMemoryCache(ONE_HOUR_MS);
const suggestionsCache = new InMemoryCache(ONE_HOUR_MS);
const trendingCache = new InMemoryCache(TWENTY_FOUR_HOURS_MS);
const itineraryCache = new InMemoryCache(ONE_HOUR_MS);
const routePlanCache = new InMemoryCache(ONE_HOUR_MS);
const hotelCache = new InMemoryCache(ONE_HOUR_MS);
const budgetCache = new InMemoryCache(ONE_HOUR_MS);
const flightCache = new InMemoryCache(TWENTY_FOUR_HOURS_MS);
const smartPlanCache = new InMemoryCache(ONE_HOUR_MS);

const FALLBACK_DESTINATIONS = [
  { name: 'Kyoto, Japan', description: 'Temple mornings, craft traditions, and thoughtful neighborhood food.' },
  { name: 'Santorini, Greece', description: 'Caldera paths, volcanic sailing, and slow Aegean evenings.' },
  { name: 'Ladakh, India', description: 'High-altitude landscapes, monasteries, and carefully paced road trips.' },
  { name: 'Swiss Alps', description: 'Panoramic rail journeys, mountain villages, and glass-blue lakes.' },
  { name: 'Kerala, India', description: 'Tea hills, backwater cruises, heritage towns, and restorative stays.' },
];

const FALLBACK_PLACE_NAMES = [
  'Kyoto, Japan',
  'Santorini, Greece',
  'Leh, Ladakh, India',
  'Lucerne, Switzerland',
  'Munnar, Kerala, India',
  'Jaipur, Rajasthan, India',
  'Ubud, Bali, Indonesia',
  'Paros, Greece',
];

function fallbackImage(place) {
  const normalized = String(place || '').toLowerCase();
  if (normalized.includes('japan') || normalized.includes('kyoto')) return '/images/kyoto.jpg';
  if (normalized.includes('greece') || normalized.includes('santorini') || normalized.includes('paros')) {
    return '/images/santorini.jpg';
  }
  return '/images/alps.jpg';
}

function fallbackSuggestions(query) {
  const normalized = String(query || '').toLowerCase();
  const matches = FALLBACK_PLACE_NAMES.filter((place) => place.toLowerCase().includes(normalized));
  return (matches.length ? matches : FALLBACK_PLACE_NAMES).slice(0, 8);
}

function fallbackAttractions(destination) {
  return [
    { name: `${destination} Old Quarter`, description: 'Begin with a guided orientation through the historic center and its everyday local life.' },
    { name: 'Signature viewpoint', description: `Choose a sunrise or golden-hour viewpoint that reveals the landscape around ${destination}.` },
    { name: 'Local food market', description: 'Taste regional specialties with time to speak to vendors and learn what is in season.' },
    { name: 'Craft and culture studio', description: 'Meet local makers through a small workshop or independently run cultural space.' },
    { name: 'Slow neighborhood walk', description: 'Leave one unhurried afternoon for cafés, side streets, and spontaneous discoveries.' },
  ];
}

// ── Gemini helper ─────────────────────────────────────────────────────────────
/**
 * Call the Gemini generateContent API with the given prompt.
 * Returns the raw text from the first candidate.
 * Throws on network/API error.
 *
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini request failed with status ${response.status}`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

// ── GET /image ────────────────────────────────────────────────────────────────
/**
 * Returns a landscape photo URL for the given place from Unsplash.
 *
 * Query params:
 *   place (required) — destination name
 *
 * Responses:
 *   200 { url }           — image URL (X-Cache: HIT or MISS)
 *   400                   — missing/invalid query param
 *   404 { message }       — no image found for place
 *   429                   — rate limit exceeded
 *   502 { message }       — Unsplash API error
 */
router.get('/image', rateLimiter, validateQueryParam('place'), async (req, res) => {
  const place = req.sanitized.place;
  const cacheKey = `image:${place.toLowerCase()}`;

  // Cache hit
  const cached = imageCache.get(cacheKey);
  if (cached !== null) {
    return res.set('X-Cache', 'HIT').json({ url: cached });
  }

  // Cache miss — call Unsplash
  try {
    if (!UNSPLASH_ACCESS_KEY) {
      const url = fallbackImage(place);
      imageCache.set(cacheKey, url);
      return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ url });
    }
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(place)}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.errors?.[0] || `Unsplash request failed with status ${response.status}`);
    }

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ message: `No image found for '${place}'.` });
    }

    const url = data.results[0].urls.regular;
    imageCache.set(cacheKey, url);

    return res.set('X-Cache', 'MISS').json({ url });
  } catch (err) {
    console.error('[aiRoutes] Unsplash error:', err.message);
    const url = fallbackImage(place);
    imageCache.set(cacheKey, url);
    return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ url });
  }
});

// ── GET /suggestions ──────────────────────────────────────────────────────────
/**
 * Returns up to 8 AI-generated place name suggestions matching the query.
 *
 * Query params:
 *   q (required) — search query (min 2 characters)
 *
 * Responses:
 *   200 { suggestions }   — array of place name strings (X-Cache: HIT or MISS)
 *   400 { message }       — missing/invalid query param or query too short
 *   429                   — rate limit exceeded
 *   502 { message }       — Gemini API error
 */
router.get('/suggestions', rateLimiter, validateQueryParam('q'), async (req, res) => {
  const query = req.sanitized.q;

  // Enforce minimum length of 2
  if (query.length < 2) {
    return res.status(400).json({ message: 'Query must be at least 2 characters.' });
  }

  const cacheKey = `suggestions:${query.toLowerCase()}`;

  // Cache hit
  const cached = suggestionsCache.get(cacheKey);
  if (cached !== null) {
    return res.set('X-Cache', 'HIT').json({ suggestions: cached });
  }

  // Cache miss — call Gemini
  try {
    const prompt = `Suggest up to 8 real place names matching '${query}'. Return ONLY a JSON array of strings, no markdown.`;
    const text = await callGemini(prompt);
    // Strip markdown code fences if present
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);
    const suggestions = Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
      : [];

    // If Gemini returns no results or empty array
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return res.set('X-Cache', 'MISS').json({ suggestions: [] });
    }

    suggestionsCache.set(cacheKey, suggestions);
    return res.set('X-Cache', 'MISS').json({ suggestions });
  } catch (err) {
    console.error('[aiRoutes] Gemini suggestions error:', err.message);
    const suggestions = fallbackSuggestions(query);
    suggestionsCache.set(cacheKey, suggestions);
    return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ suggestions });
  }
});

// ── GET /trending ─────────────────────────────────────────────────────────────
/**
 * Returns 5 trending travel destinations with short descriptions.
 *
 * Responses:
 *   200 { destinations }  — array of { name, description } objects (X-Cache: HIT or MISS)
 *   429                   — rate limit exceeded
 *   502 { message }       — Gemini API error or parse failure
 */
router.get('/trending', rateLimiter, async (req, res) => {
  const cacheKey = 'trending';

  // Cache hit
  const cached = trendingCache.get(cacheKey);
  if (cached !== null) {
    return res.set('X-Cache', 'HIT').json({ destinations: cached });
  }

  // Cache miss — call Gemini
  try {
    const prompt =
      `Suggest 5 trending travel destinations in ${new Date().getFullYear()} with short descriptions. Return ONLY a JSON array of objects with fields name (string) and description (string, max 100 chars), no markdown.`;
    const text = await callGemini(prompt);
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate structure and normalise: truncate descriptions to 100 chars
    if (!Array.isArray(parsed) || parsed.length < 5) {
      console.error('[aiRoutes] Trending: invalid response shape from Gemini');
      trendingCache.set(cacheKey, FALLBACK_DESTINATIONS);
      return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({
        destinations: FALLBACK_DESTINATIONS,
      });
    }

    const destinations = parsed.slice(0, 5).map((d) => ({
      name: String(d.name || '').trim(),
      description: String(d.description || '').trim().slice(0, 100),
    })).filter((d) => d.name.length > 0);

    if (destinations.length < 5) {
      console.error('[aiRoutes] Trending: fewer than 5 valid destinations after normalisation');
      trendingCache.set(cacheKey, FALLBACK_DESTINATIONS);
      return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({
        destinations: FALLBACK_DESTINATIONS,
      });
    }

    trendingCache.set(cacheKey, destinations);
    return res.set('X-Cache', 'MISS').json({ destinations });
  } catch (err) {
    console.error('[aiRoutes] Gemini trending error:', err.message);
    trendingCache.set(cacheKey, FALLBACK_DESTINATIONS);
    return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({
      destinations: FALLBACK_DESTINATIONS,
    });
  }
});

// ── GET /itinerary-suggestions ────────────────────────────────────────────────
/**
 * Returns top 5 attractions for the given destination.
 *
 * Query params:
 *   place (required) — destination name
 *
 * Responses:
 *   200 { attractions }   — array of { name, description } objects (X-Cache: HIT or MISS)
 *   400 { message }       — missing/invalid query param
 *   429                   — rate limit exceeded
 *   502 { message }       — Gemini API error or parse failure
 */
router.get('/itinerary-suggestions', rateLimiter, validateQueryParam('place'), async (req, res) => {
  const destination = req.sanitized.place;
  const cacheKey = `itinerary:${destination.toLowerCase()}`;

  // Cache hit
  const cached = itineraryCache.get(cacheKey);
  if (cached !== null) {
    return res.set('X-Cache', 'HIT').json({ attractions: cached });
  }

  // Cache miss — call Gemini
  try {
    const prompt = `Suggest top 5 attractions in ${destination} for a travel itinerary. Return ONLY a JSON array of objects with fields name (string) and description (string, max 150 chars), no markdown.`;
    const text = await callGemini(prompt);
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate structure and normalise: truncate descriptions to 150 chars
    if (!Array.isArray(parsed) || parsed.length < 5) {
      console.error('[aiRoutes] Itinerary: invalid response shape from Gemini');
      const attractions = fallbackAttractions(destination);
      itineraryCache.set(cacheKey, attractions);
      return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ attractions });
    }

    const attractions = parsed.slice(0, 5).map((a) => ({
      name: String(a.name || '').trim(),
      description: String(a.description || '').trim().slice(0, 150),
    })).filter((a) => a.name.length > 0);

    if (attractions.length < 5) {
      console.error('[aiRoutes] Itinerary: fewer than 5 valid attractions after normalisation');
      const fallback = fallbackAttractions(destination);
      itineraryCache.set(cacheKey, fallback);
      return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ attractions: fallback });
    }

    itineraryCache.set(cacheKey, attractions);
    return res.set('X-Cache', 'MISS').json({ attractions });
  } catch (err) {
    console.error('[aiRoutes] Gemini itinerary error:', err.message);
    const attractions = fallbackAttractions(destination);
    itineraryCache.set(cacheKey, attractions);
    return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ attractions });
  }
});

// ── GET /route-plan ──────────────────────────────────────────────────────────
/**
 * Returns an AI-generated route plan between destinations or within a region.
 *
 * Query params:
 *   origin (required) — starting point
 *   destination (required) — end point
 *   stops (optional) — comma-separated intermediate stops
 *
 * Responses:
 *   200 { route }         — route plan with waypoints, distances, times
 *   400 { message }       — missing/invalid params
 *   429                   — rate limit exceeded
 *   502 { message }       — Gemini API error
 */
router.get('/route-plan', rateLimiter, validateQueryParam('origin'), validateQueryParam('destination'), async (req, res) => {
  const origin = req.sanitized.origin;
  const destination = req.sanitized.destination;
  const stops = req.query.stops ? String(req.query.stops).split(',').map(s => s.trim()).filter(Boolean) : [];

  const cacheKey = `route:${origin.toLowerCase()}|${destination.toLowerCase()}|${stops.join(',')}`;
  const cached = routePlanCache.get(cacheKey);
  if (cached !== null) {
    return res.set('X-Cache', 'HIT').json({ route: cached });
  }

  try {
    const stopsText = stops.length ? ` with stops at: ${stops.join(', ')}` : '';
    const prompt =
      `Plan a travel route from "${origin}" to "${destination}"${stopsText}. ` +
      'Return ONLY a JSON object, no markdown, with these fields:\n' +
      '- origin (string)\n' +
      '- destination (string)\n' +
      '- waypoints (array of {name, description})\n' +
      '- totalDistance (string, e.g. "350 km")\n' +
      '- estimatedTravelTime (string, e.g. "4 hours 30 minutes")\n' +
      '- bestTransportMode (string, e.g. "train", "car", "flight", "mixed")\n' +
      '- highlights (array of strings, up to 3)\n' +
      '- routingAdvice (string, max 150 chars)';
    const text = await callGemini(prompt);
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const route = JSON.parse(cleaned);

    if (!route.origin || !route.destination) {
      return res.status(502).json({ message: 'Gemini returned an incomplete route plan.' });
    }

    // Normalize fields
    route.waypoints = Array.isArray(route.waypoints) ? route.waypoints.slice(0, 10) : [];
    route.highlights = Array.isArray(route.highlights) ? route.highlights.slice(0, 3) : [];
    route.totalDistance = String(route.totalDistance || '').trim();
    route.estimatedTravelTime = String(route.estimatedTravelTime || '').trim();
    route.bestTransportMode = String(route.bestTransportMode || 'mixed').trim();
    route.routingAdvice = String(route.routingAdvice || '').trim().slice(0, 150);

    routePlanCache.set(cacheKey, route);
    return res.set('X-Cache', 'MISS').json({ route });
  } catch (err) {
    console.error('[aiRoutes] Route-plan error:', err.message);
    // Provide a sensible fallback
    const fallback = {
      origin,
      destination,
      waypoints: [{ name: `${origin} → ${destination}`, description: `Direct route from ${origin} to ${destination}.` }],
      totalDistance: 'Travel distance unknown',
      estimatedTravelTime: 'Travel time unknown',
      bestTransportMode: 'mixed',
      highlights: [`Explore ${origin}`, `Journey to ${destination}`],
      routingAdvice: `Plan your route from ${origin} to ${destination} and check local transport schedules.`,
    };
    routePlanCache.set(cacheKey, fallback);
    return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ route: fallback });
  }
});

// ── GET /hotel-suggestions ──────────────────────────────────────────────────
/**
 * Returns AI-recommended hotel options for a destination.
 *
 * Query params:
 *   place (required) — destination name
 *   budget (optional) — max budget per night
 *
 * Responses:
 *   200 { hotels }             — array of hotel objects
 *   400 { message }            — missing/invalid params
 *   429                        — rate limit exceeded
 *   502 { message }            — Gemini API error
 */
router.get('/hotel-suggestions', rateLimiter, validateQueryParam('place'), async (req, res) => {
  const place = req.sanitized.place;
  const budget = req.query.budget ? Number(req.query.budget) : null;

  const cacheKey = `hotels:${place.toLowerCase()}:${budget || 'any'}`;
  const cached = hotelCache.get(cacheKey);
  if (cached !== null) {
    return res.set('X-Cache', 'HIT').json({ hotels: cached });
  }

  try {
    const budgetText = budget ? ` with a max budget of $${budget} per night` : '';
    const prompt =
      `Suggest 4 hotel options in "${place}"${budgetText}. ` +
      'Return ONLY a JSON array of objects, no markdown, each with:\n' +
      '- name (string)\n' +
      '- type (string: "budget", "mid-range", "luxury", "boutique")\n' +
      '- estimatedPricePerNight (number in USD)\n' +
      '- rating (number 1-5, one decimal place)\n' +
      '- description (string, max 120 chars)\n' +
      '- location (string, neighborhood/area)\n' +
      '- amenities (array of strings, up to 5)';
    const text = await callGemini(prompt);
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return res.status(502).json({ message: 'Gemini returned no hotel suggestions.' });
    }

    const hotels = parsed.slice(0, 6).map((h) => ({
      name: String(h.name || '').trim(),
      type: String(h.type || 'mid-range').trim(),
      estimatedPricePerNight: Math.round(Number(h.estimatedPricePerNight) || 0),
      rating: Math.min(5, Math.max(0, Number(h.rating) || 0)),
      description: String(h.description || '').trim().slice(0, 120),
      location: String(h.location || '').trim(),
      amenities: Array.isArray(h.amenities) ? h.amenities.slice(0, 5).map(a => String(a).trim()) : [],
    })).filter((h) => h.name.length > 0);

    if (hotels.length === 0) {
      return res.status(502).json({ message: 'No valid hotel data returned.' });
    }

    hotelCache.set(cacheKey, hotels);
    return res.set('X-Cache', 'MISS').json({ hotels });
  } catch (err) {
    console.error('[aiRoutes] Hotel error:', err.message);
    const fallback = [
      {
        name: `${place} Central Hotel`,
        type: 'mid-range',
        estimatedPricePerNight: budget ? Math.round(budget * 0.8) : 120,
        rating: 4.0,
        description: `Conveniently located in the heart of ${place} with easy access to major attractions.`,
        location: 'City Center',
        amenities: ['Free WiFi', 'Breakfast', 'Air conditioning', '24-hour front desk'],
      },
      {
        name: `${place} Boutique Stay`,
        type: 'boutique',
        estimatedPricePerNight: budget ? Math.round(budget * 1.2) : 180,
        rating: 4.5,
        description: `A charming boutique option reflecting the character of ${place}.`,
        location: 'Historic District',
        amenities: ['Free WiFi', 'Concierge', 'Air conditioning', 'Room service'],
      },
    ];
    hotelCache.set(cacheKey, fallback);
    return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ hotels: fallback });
  }
});

// ── POST /budget-estimate ───────────────────────────────────────────────────
/**
 * Returns an AI-powered budget estimate for a trip.
 *
 * Body params (JSON):
 *   destination (required)
 *   duration (required) — number of days
 *   travelerCount (required)
 *   travelStyle (optional) — "budget", "balanced", "premium"
 *   transportMode (optional)
 *   accommodationType (optional)
 *
 * Responses:
 *   200 { estimate } — budget breakdown object
 *   400 { message }  — missing/invalid body params
 *   429              — rate limit exceeded
 *   502 { message }  — Gemini API error
 */
router.post('/budget-estimate', rateLimiter, async (req, res) => {
  const { destination, duration, travelerCount, travelStyle, transportMode, accommodationType } = req.body || {};

  if (!destination || !duration || !travelerCount) {
    return res.status(400).json({ message: 'Please provide destination, duration, and travelerCount.' });
  }

  const numDuration = Number(duration) || 1;
  const numTravelers = Number(travelerCount) || 1;
  const style = String(travelStyle || 'balanced').trim();

  const cacheKey = `budget:${destination.toLowerCase()}:${numDuration}:${numTravelers}:${style}`;
  const cached = budgetCache.get(cacheKey);
  if (cached !== null) {
    return res.set('X-Cache', 'HIT').json({ estimate: cached });
  }

  try {
    const prompt =
      `Provide a budget estimate for a ${numDuration}-day trip to "${destination}" for ${numTravelers} traveler(s), ${style} travel style. ` +
      'Return ONLY a JSON object, no markdown, with these fields (all numbers in USD):\n' +
      '- totalEstimated (number)\n' +
      '- breakdown: { transport (number), accommodation (number), food (number), activities (number), miscellaneous (number) }\n' +
      '- perPerson (number)\n' +
      '- currency (string, e.g. "USD")\n' +
      '- costLevel (string: "budget", "moderate", "expensive")\n' +
      '- tips (array of strings, up to 3)';
    const text = await callGemini(prompt);
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const estimate = JSON.parse(cleaned);

    if (!estimate.totalEstimated || !estimate.breakdown) {
      return res.status(502).json({ message: 'Gemini returned an incomplete budget estimate.' });
    }

    // Normalize
    estimate.totalEstimated = Math.round(Number(estimate.totalEstimated) || 0);
    estimate.perPerson = Math.round(Number(estimate.perPerson) || 0);
    estimate.currency = String(estimate.currency || 'USD').trim();
    estimate.costLevel = String(estimate.costLevel || 'moderate').trim();
    estimate.tips = Array.isArray(estimate.tips) ? estimate.tips.slice(0, 3).map(t => String(t).trim()) : [];

    const bd = estimate.breakdown;
    if (bd) {
      estimate.breakdown = {
        transport: Math.round(Number(bd.transport) || 0),
        accommodation: Math.round(Number(bd.accommodation) || 0),
        food: Math.round(Number(bd.food) || 0),
        activities: Math.round(Number(bd.activities) || 0),
        miscellaneous: Math.round(Number(bd.miscellaneous) || 0),
      };
    }

    budgetCache.set(cacheKey, estimate);
    return res.set('X-Cache', 'MISS').json({ estimate });
  } catch (err) {
    console.error('[aiRoutes] Budget error:', err.message);
    // Fallback estimate
    const baseDaily = style === 'budget' ? 100 : style === 'premium' ? 400 : 200;
    const total = baseDaily * numDuration * numTravelers;
    const fallback = {
      totalEstimated: total,
      perPerson: Math.round(total / numTravelers),
      currency: 'USD',
      costLevel: style === 'budget' ? 'budget' : style === 'premium' ? 'expensive' : 'moderate',
      breakdown: {
        transport: Math.round(total * 0.25),
        accommodation: Math.round(total * 0.35),
        food: Math.round(total * 0.2),
        activities: Math.round(total * 0.12),
        miscellaneous: Math.round(total * 0.08),
      },
      tips: [
        `Consider traveling during off-peak season to ${destination} for better rates.`,
        'Look for combo deals on accommodation and activities.',
        `Allocate 10-15% of your budget for unexpected expenses.`,
      ],
    };
    budgetCache.set(cacheKey, fallback);
    return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ estimate: fallback });
  }
});

// ── GET /flight-info ────────────────────────────────────────────────────────
/**
 * Returns AI-simulated flight options between two cities.
 *
 * Query params:
 *   from (required) — departure city
 *   to (required) — arrival city
 *   date (optional) — departure date (YYYY-MM-DD)
 *
 * Responses:
 *   200 { flights }           — array of flight objects
 *   400 { message }           — missing/invalid params
 *   429                       — rate limit exceeded
 *   502 { message }           — Gemini API error
 */
router.get('/flight-info', rateLimiter, validateQueryParam('from'), validateQueryParam('to'), async (req, res) => {
  const from = req.sanitized.from;
  const to = req.sanitized.to;
  const date = req.query.date ? String(req.query.date).trim() : '';

  const cacheKey = `flights:${from.toLowerCase()}:${to.toLowerCase()}:${date || 'any'}`;
  const cached = flightCache.get(cacheKey);
  if (cached !== null) {
    return res.set('X-Cache', 'HIT').json({ flights: cached });
  }

  try {
    const dateText = date ? ` on ${date}` : '';
    const prompt =
      `Provide 4 realistic flight options from "${from}" to "${to}"${dateText}. ` +
      'Return ONLY a JSON array of objects, no markdown, each with:\n' +
      '- airline (string)\n' +
      '- flightNumber (string)\n' +
      '- departureTime (string, e.g. "08:30")\n' +
      '- arrivalTime (string)\n' +
      '- duration (string, e.g. "2h 45m")\n' +
      '- stops (number, 0 for non-stop)\n' +
      '- estimatedPrice (number in USD)\n' +
      '- cabinClass (string: "economy", "premium", "business")\n' +
      '- notes (string, max 100 chars)';
    const text = await callGemini(prompt);
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return res.status(502).json({ message: 'Gemini returned no flight data.' });
    }

    const flights = parsed.slice(0, 6).map((f) => ({
      airline: String(f.airline || '').trim(),
      flightNumber: String(f.flightNumber || '').trim(),
      departureTime: String(f.departureTime || '').trim(),
      arrivalTime: String(f.arrivalTime || '').trim(),
      duration: String(f.duration || '').trim(),
      stops: Math.max(0, Number(f.stops) || 0),
      estimatedPrice: Math.round(Number(f.estimatedPrice) || 0),
      cabinClass: String(f.cabinClass || 'economy').trim(),
      notes: String(f.notes || '').trim().slice(0, 100),
    })).filter((f) => f.airline.length > 0 && f.estimatedPrice > 0);

    if (flights.length === 0) {
      return res.status(502).json({ message: 'No valid flight data returned.' });
    }

    flightCache.set(cacheKey, flights);
    return res.set('X-Cache', 'MISS').json({ flights });
  } catch (err) {
    console.error('[aiRoutes] Flight error:', err.message);
    const fallback = [
      {
        airline: 'Major Airways',
        flightNumber: 'MA-101',
        departureTime: '08:30',
        arrivalTime: '11:15',
        duration: '2h 45m',
        stops: 0,
        estimatedPrice: 350,
        cabinClass: 'economy',
        notes: `Non-stop service from ${from} to ${to}.`,
      },
      {
        airline: 'SkyLink Airlines',
        flightNumber: 'SL-204',
        departureTime: '14:00',
        arrivalTime: '18:30',
        duration: '4h 30m',
        stops: 1,
        estimatedPrice: 220,
        cabinClass: 'economy',
        notes: 'One stop connection — a budget-friendly option.',
      },
    ];
    flightCache.set(cacheKey, fallback);
    return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ flights: fallback });
  }
});

// ── POST /smart-plan ────────────────────────────────────────────────────────
/**
 * Generates a complete AI-powered day-by-day travel itinerary.
 *
 * Body params (JSON):
 *   destination (required)
 *   duration (required) — number of days
 *   travelerCount (optional, default 1)
 *   travelStyle (optional) — "budget", "balanced", "premium"
 *   interests (optional) — array of strings (e.g. ["history", "food", "nature"])
 *
 * Responses:
 *   200 { plan }              — full day-by-day itinerary plan
 *   400 { message }           — missing/invalid body params
 *   429                       — rate limit exceeded
 *   502 { message }           — Gemini API error
 */
router.post('/smart-plan', rateLimiter, async (req, res) => {
  const { destination, duration, travelerCount, travelStyle, interests } = req.body || {};

  if (!destination || !duration) {
    return res.status(400).json({ message: 'Please provide destination and duration.' });
  }

  const numDuration = Math.min(30, Math.max(1, Number(duration) || 1));
  const numTravelers = Math.min(50, Math.max(1, Number(travelerCount) || 1));
  const style = String(travelStyle || 'balanced').trim();
  const interestList = Array.isArray(interests) ? interests.slice(0, 5).map(s => String(s).trim()).filter(Boolean) : [];

  const cacheKey = `smartplan:${destination.toLowerCase()}:${numDuration}:${numTravelers}:${style}:${interestList.join(',')}`;
  const cached = smartPlanCache.get(cacheKey);
  if (cached !== null) {
    return res.set('X-Cache', 'HIT').json({ plan: cached });
  }

  try {
    const interestText = interestList.length ? ` with interests in ${interestList.join(', ')}` : '';
    const prompt =
      `Create a detailed ${numDuration}-day travel itinerary for "${destination}" for ${numTravelers} traveler(s)` +
      ` with a ${style} travel style${interestText}. ` +
      'Return ONLY a JSON object, no markdown, with these fields:\n' +
      '- destination (string)\n' +
      '- duration (number)\n' +
      '- travelStyle (string)\n' +
      '- dailyPlan (array of objects, one per day. Each has:\n' +
      '    day (number),\n' +
      '    title (string),\n' +
      '    meals: { breakfast, lunch, dinner } (strings),\n' +
      '    activities (array of { time, activity, description, location }))\n' +
      '- estimatedBudget (object with total (number), currency (string))\n' +
      '- recommendations (array of strings, up to 4)\n' +
      '- packingTips (array of strings, up to 3)';
    const text = await callGemini(prompt);
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const plan = JSON.parse(cleaned);

    if (!plan.dailyPlan || !Array.isArray(plan.dailyPlan) || plan.dailyPlan.length === 0) {
      return res.status(502).json({ message: 'Gemini returned an incomplete itinerary plan.' });
    }

    // Normalize plan
    plan.destination = String(plan.destination || destination).trim();
    plan.duration = numDuration;
    plan.travelStyle = style;
    plan.dailyPlan = plan.dailyPlan.slice(0, numDuration).map((day) => ({
      day: Number(day.day) || 1,
      title: String(day.title || '').trim(),
      meals: {
        breakfast: String(day.meals?.breakfast || '').trim(),
        lunch: String(day.meals?.lunch || '').trim(),
        dinner: String(day.meals?.dinner || '').trim(),
      },
      activities: Array.isArray(day.activities) ? day.activities.slice(0, 8).map((a) => ({
        time: String(a.time || '').trim(),
        activity: String(a.activity || '').trim(),
        description: String(a.description || '').trim().slice(0, 200),
        location: String(a.location || '').trim(),
      })) : [],
    }));
    plan.estimatedBudget = plan.estimatedBudget ? {
      total: Math.round(Number(plan.estimatedBudget.total) || 0),
      currency: String(plan.estimatedBudget.currency || 'USD').trim(),
    } : { total: 0, currency: 'USD' };
    plan.recommendations = Array.isArray(plan.recommendations) ? plan.recommendations.slice(0, 4).map(r => String(r).trim()) : [];
    plan.packingTips = Array.isArray(plan.packingTips) ? plan.packingTips.slice(0, 3).map(t => String(t).trim()) : [];

    smartPlanCache.set(cacheKey, plan);
    return res.set('X-Cache', 'MISS').json({ plan });
  } catch (err) {
    console.error('[aiRoutes] Smart plan error:', err.message);
    // Fallback: generate a simple plan
    const fallbackDays = [];
    for (let d = 1; d <= numDuration; d++) {
      fallbackDays.push({
        day: d,
        title: d === 1 ? `Arrival and Orientation in ${destination}` : d === numDuration ? `Departure from ${destination}` : `Day ${d} — Explore ${destination}`,
        meals: { breakfast: 'Hotel breakfast', lunch: 'Local restaurant', dinner: 'City center dining' },
        activities: [
          { time: '09:00', activity: 'Morning exploration', description: `Discover the highlights of ${destination}.`, location: `${destination} City Center` },
          { time: '12:30', activity: 'Lunch break', description: 'Enjoy local cuisine at a nearby restaurant.', location: 'Downtown' },
          { time: '15:00', activity: 'Afternoon sightseeing', description: 'Visit cultural landmarks and attractions.', location: `${destination}` },
          { time: '19:00', activity: 'Evening leisure', description: 'Dinner and evening walk.', location: 'City Center' },
        ],
      });
    }
    const fallback = {
      destination,
      duration: numDuration,
      travelStyle: style,
      dailyPlan: fallbackDays,
      estimatedBudget: { total: 200 * numDuration * numTravelers, currency: 'USD' },
      recommendations: [
        `Try local specialties and street food in ${destination}.`,
        'Book major attractions in advance to skip queues.',
        'Learn a few basic phrases in the local language.',
        'Check travel advisories and visa requirements before departure.',
      ],
      packingTips: [
        'Pack comfortable walking shoes for sightseeing.',
        'Bring a universal power adapter.',
        'Carry a reusable water bottle.',
      ],
    };
    smartPlanCache.set(cacheKey, fallback);
    return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ plan: fallback });
  }
});

module.exports = router;
