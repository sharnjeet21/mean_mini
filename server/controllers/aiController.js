const aiService = require("../services/ai.service");

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
    const { destination, duration, travelerCount, travelStyle } = req.body;
    const data = {
      totalEstimated: duration * travelerCount * 120,
      perPerson: duration * 120,
      currency: "USD",
      costLevel: "moderate",
      breakdown: { transport: 200, accommodation: 350, food: 180, activities: 150, miscellaneous: 80 },
      tips: ["Book flights early", "Use city travel cards"],
    };
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

module.exports = {
  handleSuggestions,
  handleRoutePlan,
  handleHotels,
  handleBudgetEstimate,
  handleFlightInfo,
  handleSmartPlan,
};