const aiService = require("../services/ai.service");
const itineraryDraftService = require("../services/itineraryDraftService");

async function handleSuggestions(req, res, next) {
  try {
    const cached = await aiService.getCached(
      aiService.cacheKey("suggestions", req.query),
      1000 * 60 * 60
    );
    if (cached) return res.json({ suggestions: cached });

    const result = { suggestions: ["Eiffel Tower", "Louvre Museum", "Seine Cruise", "Montmartre", "Local Cuisine Tour"] };
    await aiService.setCache(aiService.cacheKey("suggestions", req.query), result.suggestions, 1000 * 60 * 60);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function handleRoutePlan(req, res, next) {
  try {
    const { origin, destination, stops } = req.query;
    const data = {
      origin,
      destination,
      waypoints: stops ? stops.split(",").map(s => ({ name: s.trim() })) : [],
      totalDistance: "~320 km",
      estimatedTravelTime: "~3h 15m",
      bestTransportMode: "train",
      highlights: ["Historic route", "Scenic views"],
      routingAdvice: "Book train tickets in advance for best fares.",
    };
    res.json({ route: data });
  } catch (err) {
    next(err);
  }
}

async function handleHotels(req, res, next) {
  try {
    const { place, budget } = req.query;
    const data = [
      { name: `${place} Grand Hotel`, type: "luxury", estimatedPricePerNight: 180, rating: 4.5, description: "City center stay", location: place, amenities: ["wifi", "pool", "gym"] },
      { name: `${place} Budget Inn`, type: "budget", estimatedPricePerNight: 55, rating: 3.8, description: "Affordable stay", location: place, amenities: ["wifi"] },
    ];
    if (budget) data[0].estimatedPricePerNight = Math.min(data[0].estimatedPricePerNight, Number(budget));
    res.json({ hotels: data });
  } catch (err) {
    next(err);
  }
}

async function handleBudgetEstimate(req, res, next) {
  try {
    const { destination, duration, travelerCount, travelStyle, userBudget } = req.body;
    const { estimateCost } = require('../services/costEstimationService');
    const data = await estimateCost({
      destination,
      duration: Number(duration),
      travelerCount: Number(travelerCount) || 1,
      travelStyle: travelStyle || 'balanced',
      userBudget: userBudget || undefined,
    });
    res.json({ estimate: data });
  } catch (err) {
    next(err);
  }
}

async function handleFlightInfo(req, res, next) {
  try {
    const { from, to } = req.query;
    const data = [
      { airline: "SkyAir", flightNumber: "SA101", departureTime: "08:00", arrivalTime: "11:30", duration: "3h 30m", stops: 0, estimatedPrice: 220, cabinClass: "economy", notes: "Non-stop" },
      { airline: "BlueWings", flightNumber: "BW204", departureTime: "13:15", arrivalTime: "17:45", duration: "4h 30m", stops: 1, estimatedPrice: 185, cabinClass: "economy", notes: "1 stop" },
    ];
    res.json({ flights: data });
  } catch (err) {
    next(err);
  }
}

// LEGACY MOCK BEHAVIOR
// This endpoint returns deterministic, hard-coded mock data. 
// It does NOT use a real AI provider. It is kept only to support the existing UI
// until the new itinerary draft engine is fully integrated.
async function handleSmartPlan(req, res, next) {
  try {
    const { destination, duration, travelerCount = 1, travelStyle = "balanced" } = req.body;
    const data = {
      destination,
      duration: Number(duration),
      travelStyle,
      dailyPlan: Array.from({ length: Number(duration) }, (_, i) => ({
        day: i + 1,
        title: `Day ${i + 1}`,
        meals: { breakfast: "Local café", lunch: "Street food", dinner: "Restaurant" },
        activities: [
          { time: "09:00", activity: "Sightseeing", description: "Top attraction", location: destination },
          { time: "14:00", activity: "Museum", description: "Cultural visit", location: destination },
        ],
      })),
      estimatedBudget: { total: Number(duration) * Number(travelerCount) * 120, currency: "USD" },
      recommendations: ["Pack light", "Buy city pass"],
      packingTips: ["Comfortable shoes", "Rain jacket"],
    };
    res.json({ plan: data });
  } catch (err) {
    next(err);
  }
}

async function handleItineraryDraft(req, res, next) {
  try {
    const userId = req.user ? (req.user._id || req.user.id) : '';
    const draft = await itineraryDraftService.generateItineraryDraft(req.body, userId);
    res.json(draft);
  } catch (err) {
    console.error('[aiController] Itinerary draft error:', err.message);
    // Return a controlled application error. Do not generate fake data.
    res.status(503).json({ message: 'We couldn\'t generate your trip draft right now. Your trip has not been saved.', details: err.message });
  }
}

async function handleExtractIntent(req, res, next) {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const extracted = await itineraryDraftService.extractTripIntent(text);
    res.json(extracted);
  } catch (err) {
    console.error('[aiController] Intent extraction error:', err.message);
    res.status(503).json({ message: 'We couldn\'t extract your trip intent right now.', details: err.message });
  }
}

async function handleGeocode(req, res, next) {
  try {
    const { place } = req.query;
    if (!place || !place.trim()) {
      return res.status(400).json({ error: 'place query parameter is required' });
    }
    const mapboxAdapter = require('../adapters/mapboxAdapter');
    const result = await mapboxAdapter.geocode(place.trim());
    if (!result) {
      return res.status(404).json({ error: `Could not geocode: ${place}`, lat: 0, lng: 0 });
    }
    res.json({ lat: result.lat, lng: result.lng, name: result.name, bbox: result.bbox });
  } catch (err) {
    next(err);
  }
}

async function handleDirections(req, res, next) {
  try {
    const { from, to, mode = 'driving' } = req.body;
    if (!from || !to || typeof from.lat !== 'number' || typeof to.lat !== 'number') {
      return res.status(400).json({ error: 'from and to with lat/lng are required' });
    }
    const mapboxAdapter = require('../adapters/mapboxAdapter');
    const result = await mapboxAdapter.getDirections(from, to, mode);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleSuggestions,
  handleRoutePlan,
  handleHotels,
  handleBudgetEstimate,
  handleFlightInfo,
  handleSmartPlan,
  handleItineraryDraft,
  handleExtractIntent,
  handleGeocode,
  handleDirections,
};