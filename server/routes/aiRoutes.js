const express = require("express");
const { rateLimiter } = require("../middleware/rateLimiter");
const { validateQueryParam } = require("../middleware/inputValidator");
const { InMemoryCache } = require("../utils/inMemoryCache");
const aiController = require("../controllers/aiController");

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
const ONE_HOUR_MS         = 3_600_000;
const TWENTY_FOUR_HOURS_MS = 86_400_000;

const imageCache       = new InMemoryCache(ONE_HOUR_MS);
const suggestionsCache = new InMemoryCache(ONE_HOUR_MS);
const trendingCache    = new InMemoryCache(TWENTY_FOUR_HOURS_MS);
const itineraryCache   = new InMemoryCache(ONE_HOUR_MS);

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
router.get('/image', rateLimiter, validateQueryParam('place'), async (req, res) => {
  const place    = req.sanitized.place;
  const cacheKey = `image:${place.toLowerCase()}`;

  const cached = imageCache.get(cacheKey);
  if (cached !== null) return res.set('X-Cache', 'HIT').json({ url: cached });

  try {
    if (!UNSPLASH_ACCESS_KEY) {
      const url = fallbackImage(place);
      imageCache.set(cacheKey, url);
      return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ url });
    }
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(place)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
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
router.get('/suggestions', rateLimiter, validateQueryParam('q'), async (req, res) => {
  const query    = req.sanitized.q;
  const cacheKey = `suggestions:${query.toLowerCase()}`;

  if (query.length < 2) {
    return res.status(400).json({ message: 'Query must be at least 2 characters.' });
  }

  const cached = suggestionsCache.get(cacheKey);
  if (cached !== null) return res.set('X-Cache', 'HIT').json({ suggestions: cached });

  try {
    const prompt = `Suggest up to 8 real place names matching '${query}'. Return ONLY a JSON array of strings, no markdown.`;
    const text   = await callGemini(prompt);
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);
    const suggestions = Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
      : [];

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
router.get('/trending', rateLimiter, async (req, res) => {
  const cacheKey = 'trending';

  const cached = trendingCache.get(cacheKey);
  if (cached !== null) return res.set('X-Cache', 'HIT').json({ destinations: cached });

  try {
    const prompt =
      `Suggest 5 trending travel destinations in ${new Date().getFullYear()} with short descriptions. Return ONLY a JSON array of objects with fields name (string) and description (string, max 100 chars), no markdown.`;
    const text = await callGemini(prompt);
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const parsed  = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length < 5) {
      console.error('[aiRoutes] Trending: invalid response shape from Gemini');
      trendingCache.set(cacheKey, FALLBACK_DESTINATIONS);
      return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({
        destinations: FALLBACK_DESTINATIONS,
      });
    }

    const destinations = parsed.slice(0, 5).map((d) => ({
      name:        String(d.name        || '').trim(),
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
router.get('/itinerary-suggestions', rateLimiter, validateQueryParam('place'), async (req, res) => {
  const destination = req.sanitized.place;
  const cacheKey    = `itinerary:${destination.toLowerCase()}`;

  const cached = itineraryCache.get(cacheKey);
  if (cached !== null) return res.set('X-Cache', 'HIT').json({ attractions: cached });

  try {
    const prompt = `Suggest top 5 attractions in ${destination} for a travel itinerary. Return ONLY a JSON array of objects with fields name (string) and description (string, max 150 chars), no markdown.`;
    const text    = await callGemini(prompt);
    const cleaned = text.replace(/```(?:json)?\n?/gi, '').trim();
    const parsed  = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length < 5) {
      console.error('[aiRoutes] Itinerary: invalid response shape from Gemini');
      const attractions = fallbackAttractions(destination);
      itineraryCache.set(cacheKey, attractions);
      return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json({ attractions });
    }

    const attractions = parsed.slice(0, 5).map((a) => ({
      name:        String(a.name        || '').trim(),
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

// New routes from origin/main
router.get("/route-plan", rateLimiter, (req, res, next) => {
  if (!req.query.origin || !req.query.destination) return res.status(400).json({ error: "origin and destination are required" });
  aiController.handleRoutePlan(req, res, next);
});

router.get("/hotel-suggestions", rateLimiter, (req, res, next) => {
  if (!req.query.place) return res.status(400).json({ error: "place is required" });
  aiController.handleHotels(req, res, next);
});

router.post("/budget-estimate", rateLimiter, (req, res, next) => {
  if (!req.body.destination || !req.body.duration) return res.status(400).json({ error: "destination and duration are required" });
  aiController.handleBudgetEstimate(req, res, next);
});

router.get("/flight-info", rateLimiter, (req, res, next) => {
  if (!req.query.from || !req.query.to) return res.status(400).json({ error: "from and to are required" });
  aiController.handleFlightInfo(req, res, next);
});

router.post("/smart-plan", rateLimiter, (req, res, next) => {
  if (!req.body.destination) return res.status(400).json({ error: "destination is required" });
  aiController.handleSmartPlan(req, res, next);
});

module.exports = router;