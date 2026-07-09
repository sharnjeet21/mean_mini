const express = require("express");
const { rateLimiter } = require("../middleware/rateLimiter");
const { validateQueryParam } = require("../middleware/inputValidator");
const { InMemoryCache } = require("../utils/inMemoryCache");
const aiController = require("../controllers/aiController");
const { enrichWithImage } = require("../services/imageService");
const { authenticate } = require("../middleware/auth");
const { getAiProvider } = require("../services/aiProviderResolver");
const itineraryDraftService = require("../services/itineraryDraftService");

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
const travelSearchCache = new InMemoryCache(ONE_HOUR_MS);

const FALLBACK_DESTINATIONS = [
  { name: 'Kyoto, Japan', description: 'Temple mornings, craft traditions, and thoughtful neighborhood food.' },
  { name: 'Santorini, Greece', description: 'Caldera paths, volcanic sailing, and slow Aegean evenings.' },
  { name: 'Ladakh, India', description: 'High-altitude landscapes, monasteries, and carefully paced road trips.' },
  { name: 'Swiss Alps', description: 'Panoramic rail journeys, mountain villages, and glass-blue lakes.' },
  { name: 'Kerala, India', description: 'Tea hills, backwater cruises, heritage towns, and restorative stays.' },
];

const POPULAR_DESTINATIONS = [
  'Amsterdam, Netherlands',
  'Athens, Greece',
  'Bangkok, Thailand',
  'Barcelona, Spain',
  'Berlin, Germany',
  'Boston, USA',
  'Brussels, Belgium',
  'Budapest, Hungary',
  'Buenos Aires, Argentina',
  'Cairo, Egypt',
  'Cape Town, South Africa',
  'Chicago, USA',
  'Delhi, India',
  'Dubai, UAE',
  'Dublin, Ireland',
  'Edinburgh, UK',
  'Florence, Italy',
  'Goa, India',
  'Hanoi, Vietnam',
  'Hong Kong, China',
  'Istanbul, Turkey',
  'Jaipur, Rajasthan, India',
  'Kyoto, Japan',
  'London, UK',
  'Los Angeles, USA',
  'Madrid, Spain',
  'Manila, Philippines',
  'Melbourne, Australia',
  'Mexico City, Mexico',
  'Miami, USA',
  'Milan, Italy',
  'Montreal, Canada',
  'Mumbai, India',
  'Munich, Germany',
  'Munnar, Kerala, India',
  'New York City, USA',
  'Osaka, Japan',
  'Oslo, Norway',
  'Paris, France',
  'Prague, Czech Republic',
  'Rio de Janeiro, Brazil',
  'Rome, Italy',
  'San Francisco, USA',
  'Santorini, Greece',
  'Seoul, South Korea',
  'Shanghai, China',
  'Singapore, Singapore',
  'Stockholm, Sweden',
  'Sydney, Australia',
  'Tokyo, Japan',
  'Toronto, Canada',
  'Vancouver, Canada',
  'Venice, Italy',
  'Vienna, Austria',
  'Zurich, Switzerland',
  'Leh, Ladakh, India',
  'Lucerne, Switzerland',
  'Ubud, Bali, Indonesia',
  'Paros, Greece',
  'Meghalaya, India',
  'Shillong, Meghalaya, India',
  'Cherrapunji, Meghalaya, India',
  'Mawlynnong, Meghalaya, India',
  'Guwahati, Assam, India',
  'Manali, Himachal Pradesh, India',
  'Shimla, Himachal Pradesh, India',
  'Dharamshala, Himachal Pradesh, India',
  'Srinagar, Jammu and Kashmir, India',
  'Agra, Uttar Pradesh, India',
  'Udaipur, Rajasthan, India',
  'Jaisalmer, Rajasthan, India',
  'Kochi, Kerala, India',
  'Alleppey, Kerala, India',
  'Ooty, Tamil Nadu, India',
  'Mysore, Karnataka, India',
  'Hampi, Karnataka, India',
  'Pondicherry, India',
  'Darjeeling, West Bengal, India',
  'Gangtok, Sikkim, India'
];

function getRelevantSuggestions(query) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return [];
  }
  const normalized = query.trim().toLowerCase();
  
  const prefixMatches = [];
  const substringMatches = [];

  for (const place of POPULAR_DESTINATIONS) {
    const placeLower = place.toLowerCase();
    const words = placeLower.split(/[\s,]+/);
    const isPrefix = placeLower.startsWith(normalized) || words.some(word => word.startsWith(normalized));
    
    if (isPrefix) {
      prefixMatches.push(place);
    } else if (placeLower.includes(normalized)) {
      substringMatches.push(place);
    }
  }

  const combined = [...new Set([...prefixMatches, ...substringMatches])];
  return combined.slice(0, 8);
}

function fallbackImage(place) {
  const normalized = String(place || '').toLowerCase();
  if (normalized.includes('japan') || normalized.includes('kyoto')) return '/images/kyoto.jpg';
  if (normalized.includes('greece') || normalized.includes('santorini') || normalized.includes('paros')) {
    return '/images/santorini.jpg';
  }
  return '/images/alps.jpg';
}

function fallbackSuggestions(query) {
  return getRelevantSuggestions(query);
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

const TRAVEL_SEARCH_SCHEMA = {
  type: 'destination | itinerary | recommendation | out_of_scope',
  destination: '',
  overview: '',
  suggestedDuration: '',
  attractions: [],
  dayPlan: [],
  travelTips: [],
  recommendations: [],
};

const TRAVEL_KEYWORDS = [
  'trip', 'travel', 'visit', 'vacation', 'holiday', 'destination', 'beach', 'mountain', 'city',
  'island', 'hotel', 'stay', 'itinerary', 'days', 'day', 'tour', 'honeymoon', 'backpacking',
  'weekend', 'getaway', 'flight', 'goa', 'jaipur', 'manali', 'kerala', 'paris', 'tokyo',
];

function validateTravelSearchBody(req, res, next) {
  const query = String(req.body?.query || '').trim();
  if (!query) {
    return res.status(400).json({ message: 'Query is required.' });
  }
  if (query.length > 200) {
    return res.status(400).json({ message: 'Query must be 200 characters or fewer.' });
  }
  const printableUnicodeRegex = /^[\x20-\x7E\u00A0-\uFFFF]+$/;
  if (!printableUnicodeRegex.test(query)) {
    return res.status(400).json({ message: 'Query contains invalid characters.' });
  }

  let sanitized = query.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]+>/g, '').trim();
  req.sanitized = { ...(req.sanitized || {}), query: sanitized };
  next();
}

function looksTravelRelated(query) {
  const normalized = String(query || '').toLowerCase();
  return TRAVEL_KEYWORDS.some((keyword) => normalized.includes(keyword))
    || /\b\d+\s*(day|days|night|nights)\b/i.test(normalized);
}

function inferQueryType(query) {
  const normalized = String(query || '').toLowerCase();
  if (/\b(plan|itinerary|days|day-wise|for \d+ days?)\b/i.test(normalized)) return 'itinerary';
  if (/\b(budget|recommend|suggest|beach|mountain|family|romantic)\b/i.test(normalized)) return 'recommendation';
  return 'destination';
}

function safeText(value, max = 300) {
  return String(value || '').trim().slice(0, max);
}

function normalizeStringList(value, maxItems = 6, maxChars = 160) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => safeText(item, maxChars))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeAttractions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      name: safeText(item?.name, 80),
      description: safeText(item?.description, 180),
    }))
    .filter((item) => item.name)
    .slice(0, 6);
}

function normalizeDayPlan(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => ({
      day: Number.isInteger(Number(item?.day)) ? Number(item.day) : index + 1,
      title: safeText(item?.title || `Day ${index + 1}`, 120),
      summary: safeText(item?.summary, 220),
      places: normalizeStringList(item?.places, 5, 80),
    }))
    .slice(0, 10);
}

function fallbackTravelSearch(query) {
  const type = inferQueryType(query);
  const destinationMatch = String(query).match(/\b(?:to|in|for)\s+([A-Za-z\s,]+)$/i);
  const destination = safeText(destinationMatch?.[1] || query, 80);
  return {
    type,
    destination,
    normalizedDestination: destination,
    overview: type === 'recommendation'
      ? 'Here are travel-friendly ideas based on your request.'
      : `${destination} is a strong travel pick with a mix of highlights, local experiences, and flexible pacing.`,
    suggestedDuration: /\b\d+\s*day/i.test(query) ? query.match(/\b\d+\s*days?\b/i)?.[0] || '' : '3 to 5 days',
    attractions: type === 'recommendation' ? [] : fallbackAttractions(destination),
    dayPlan: type === 'itinerary'
      ? normalizeDayPlan([
        { day: 1, title: 'Arrival and orientation', summary: 'Settle in and explore the surrounding neighborhood.', places: ['Old Quarter', 'Local market'] },
        { day: 2, title: 'Signature highlights', summary: 'Focus on the destination’s must-see experiences at a comfortable pace.', places: ['Top viewpoint', 'Cultural landmark'] },
      ])
      : [],
    travelTips: ['Check seasonal weather before you lock dates.', 'Keep one flexible block for slower local exploration.'],
    recommendations: type === 'recommendation'
      ? [
        { name: 'Goa, India', reason: 'Easy beach escape with strong budget and short-trip options.' },
        { name: 'Pondicherry, India', reason: 'Compact coastal trip with food, cafes, and walkable neighborhoods.' },
        { name: 'Gokarna, India', reason: 'A quieter beach alternative for a relaxed 3-day plan.' },
      ]
      : [],
  };
}

function normalizeRecommendationList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      name: safeText(item?.name, 80),
      reason: safeText(item?.reason, 180),
    }))
    .filter((item) => item.name && item.reason)
    .slice(0, 5);
}

function normalizeTravelSearchResponse(raw, query) {
  const type = ['destination', 'itinerary', 'recommendation'].includes(raw?.type) ? raw.type : inferQueryType(query);
  const destination = safeText(raw?.destination, 80);
  const normalizedDestination = safeText(raw?.normalizedDestination || destination, 120);
  return {
    type,
    destination,
    normalizedDestination,
    overview: safeText(raw?.overview, 400),
    suggestedDuration: safeText(raw?.suggestedDuration, 60),
    attractions: normalizeAttractions(raw?.attractions),
    dayPlan: normalizeDayPlan(raw?.dayPlan),
    travelTips: normalizeStringList(raw?.travelTips, 6, 160),
    recommendations: normalizeRecommendationList(raw?.recommendations),
  };
}

async function fetchTravelSearchImage(destination) {
  if (!destination) return null;
  const cacheKey = `travel-image:${destination.toLowerCase()}`;
  const cached = imageCache.get(cacheKey);
  if (cached !== null) return cached;

  try {
    const image = await enrichWithImage(destination);
    if (image) {
      imageCache.set(cacheKey, image);
      return image;
    }
  } catch (err) {
    console.error('[aiRoutes] Travel image error:', err.message);
  }

  const fallback = { image: fallbackImage(destination), photographer: '', profile: '' };
  imageCache.set(cacheKey, fallback);
  return fallback;
}


async function generateStructuredTravelSearch(query) {
  const provider = getAiProvider();
  return await provider.generateStructuredTravelSearch(query);
}

router.post('/travel-search', rateLimiter, validateTravelSearchBody, async (req, res) => {
  const query = req.sanitized.query;
  const cacheKey = `travel-search:${query.toLowerCase()}`;
  const cached = travelSearchCache.get(cacheKey);
  if (cached !== null) return res.set('X-Cache', 'HIT').json(cached);

  if (!looksTravelRelated(query)) {
    const outOfScope = {
      type: 'out_of_scope',
      destination: '',
      normalizedDestination: '',
      overview: 'This assistant currently focuses on travel planning and destination discovery.',
      suggestedDuration: '',
      attractions: [],
      dayPlan: [],
      travelTips: [],
      recommendations: [],
      image: null,
    };
    travelSearchCache.set(cacheKey, outOfScope);
    return res.set('X-Cache', 'MISS').json(outOfScope);
  }

  try {
    const raw = await generateStructuredTravelSearch(query);
    if (raw?.type === 'out_of_scope') {
      const result = {
        type: 'out_of_scope',
        destination: '',
        normalizedDestination: '',
        overview: 'This assistant currently focuses on travel planning and destination discovery.',
        suggestedDuration: '',
        attractions: [],
        dayPlan: [],
        travelTips: [],
        recommendations: [],
        image: null,
      };
      travelSearchCache.set(cacheKey, result);
      return res.set('X-Cache', 'MISS').json(result);
    }

    const normalized = normalizeTravelSearchResponse(raw, query);
    if (!normalized.destination && normalized.type !== 'recommendation') {
      throw new Error('Missing destination in structured travel response');
    }

    const image = normalized.normalizedDestination
      ? await fetchTravelSearchImage(normalized.normalizedDestination)
      : null;
    const result = { ...normalized, image };
    travelSearchCache.set(cacheKey, result);
    return res.set('X-Cache', 'MISS').json(result);
  } catch (err) {
    console.error('[aiRoutes] Travel search error:', err.message);
    const fallback = fallbackTravelSearch(query);
    const image = fallback.normalizedDestination
      ? await fetchTravelSearchImage(fallback.normalizedDestination)
      : null;
    const result = { ...fallback, image };
    travelSearchCache.set(cacheKey, result);
    return res.set({ 'X-Cache': 'MISS', 'X-Source': 'fallback' }).json(result);
  }
});

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
    const provider = getAiProvider();
    const suggestions = await provider.generateAutocompleteSuggestions(query);

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return res.set('X-Cache', 'MISS').json({ suggestions: [] });
    }

    suggestionsCache.set(cacheKey, suggestions);
    return res.set('X-Cache', 'MISS').json({ suggestions });
  } catch (err) {
    console.error('[aiRoutes] suggestions error:', err.message);
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
    const provider = getAiProvider();
    const parsed = await provider.generateTrendingDestinations();

    if (!Array.isArray(parsed) || parsed.length < 5) {
      console.error('[aiRoutes] Trending: invalid response shape from provider');
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
    console.error('[aiRoutes] trending error:', err.message);
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
    const provider = getAiProvider();
    const parsed = await provider.generateItinerarySuggestions(destination);

    if (!Array.isArray(parsed) || parsed.length < 5) {
      console.error('[aiRoutes] Itinerary: invalid response shape from provider');
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
    console.error('[aiRoutes] itinerary suggestions error:', err.message);
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
router.post("/itinerary-draft", authenticate, rateLimiter, (req, res, next) => {
  if (!req.body.destination) return res.status(400).json({ error: "destination is required" });
  if (!req.body.duration) return res.status(400).json({ error: "duration is required" });
  aiController.handleItineraryDraft(req, res, next);
});

router.post("/extract-intent", authenticate, rateLimiter, (req, res, next) => {
  if (!req.body.text) return res.status(400).json({ error: "text is required" });
  aiController.handleExtractIntent(req, res, next);
});

router.post("/itinerary-revision", authenticate, rateLimiter, async (req, res, next) => {
  try {
    const { itineraryId, instruction } = req.body;
    if (!itineraryId) return res.status(400).json({ error: "itineraryId is required" });
    if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
      return res.status(400).json({ error: "instruction is required" });
    }

    const Itinerary = require("../models/Itinerary");
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) return res.status(404).json({ message: "Itinerary not found." });

    const isOwner = itinerary.createdBy && itinerary.createdBy.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isTripManager = req.user.role === 'trip-manager';

    if (req.user.role === 'user') {
      if (!isOwner || itinerary.status !== 'draft') {
        return res.status(403).json({ message: "Insufficient permissions." });
      }
    } else if (isTripManager) {
      if (!isOwner) {
        return res.status(403).json({ message: "Insufficient permissions." });
      }
    } else if (!isAdmin) {
      return res.status(403).json({ message: "Insufficient permissions." });
    }

    const revised = await itineraryDraftService.reviseItinerary(itinerary, instruction);
    if (!revised || typeof revised !== 'object' || !revised.dailyPlan) {
      throw new Error('Revised itinerary structure is invalid or missing dailyPlan.');
    }

    return res.json(revised);
  } catch (err) {
    console.error('[aiRoutes] Itinerary revision error:', err.message);
    return res.status(503).json({ message: "We couldn't revise your itinerary right now.", details: err.message });
  }
});

module.exports = router;
