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
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
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
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(place)}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      }
    );
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ message: `No image found for '${place}'.` });
    }

    const url = data.results[0].urls.regular;
    imageCache.set(cacheKey, url);

    return res.set('X-Cache', 'MISS').json({ url });
  } catch (err) {
    console.error('[aiRoutes] Unsplash error:', err.message);
    return res.status(502).json({ message: 'Image service unavailable.' });
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
    const suggestions = JSON.parse(cleaned);

    // If Gemini returns no results or empty array
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return res.set('X-Cache', 'MISS').json({ suggestions: [] });
    }

    suggestionsCache.set(cacheKey, suggestions);
    return res.set('X-Cache', 'MISS').json({ suggestions });
  } catch (err) {
    console.error('[aiRoutes] Gemini suggestions error:', err.message);
    return res.status(502).json({ message: 'AI service unavailable.' });
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
      'Suggest 5 trending travel destinations in 2026 with short descriptions. Return ONLY a JSON array of objects with fields name (string) and description (string, max 100 chars), no markdown.';
    const text = await callGemini(prompt);
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate structure and normalise: truncate descriptions to 100 chars
    if (!Array.isArray(parsed) || parsed.length < 5) {
      console.error('[aiRoutes] Trending: invalid response shape from Gemini');
      return res.status(502).json({ message: 'AI service unavailable.' });
    }

    const destinations = parsed.slice(0, 5).map((d) => ({
      name: String(d.name || '').trim(),
      description: String(d.description || '').trim().slice(0, 100),
    })).filter((d) => d.name.length > 0);

    if (destinations.length < 5) {
      console.error('[aiRoutes] Trending: fewer than 5 valid destinations after normalisation');
      return res.status(502).json({ message: 'AI service unavailable.' });
    }

    trendingCache.set(cacheKey, destinations);
    return res.set('X-Cache', 'MISS').json({ destinations });
    return res.set('X-Cache', 'MISS').json({ destinations: parsed });
  } catch (err) {
    console.error('[aiRoutes] Gemini trending error:', err.message);
    return res.status(502).json({ message: 'AI service unavailable.' });
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
      return res.status(502).json({ message: 'AI service unavailable.' });
    }

    const attractions = parsed.slice(0, 5).map((a) => ({
      name: String(a.name || '').trim(),
      description: String(a.description || '').trim().slice(0, 150),
    })).filter((a) => a.name.length > 0);

    if (attractions.length < 5) {
      console.error('[aiRoutes] Itinerary: fewer than 5 valid attractions after normalisation');
      return res.status(502).json({ message: 'AI service unavailable.' });
    }

    itineraryCache.set(cacheKey, attractions);
    return res.set('X-Cache', 'MISS').json({ attractions });
  } catch (err) {
    console.error('[aiRoutes] Gemini itinerary error:', err.message);
    return res.status(502).json({ message: 'AI service unavailable.' });
  }
});

module.exports = router;
