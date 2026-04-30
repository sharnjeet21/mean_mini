const express = require('express');
const router = express.Router();

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

// Helper function to call Gemini API
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to fetch from Gemini API');
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  
  try {
    const parsed = JSON.parse(textContent);
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item).replace(/\*\*/g, '').trim());
    }
    return [textContent];
  } catch (e) {
    // fallback if it's not valid JSON
    return textContent
      .split('\n')
      .map(line => line.replace(/^[\*\-\d\.]+\s*/, '').replace(/\*\*/g, '').trim())
      .filter(line => line.length > 0);
  }
}

// 1. GET /api/ai/itinerary?place=PLACE_NAME
router.get('/itinerary', async (req, res) => {
  try {
    const { place } = req.query;
    if (!place) {
      return res.status(400).json({ error: 'Place is required' });
    }

    const prompt = `Suggest a 5-day travel itinerary for ${place}. Provide exactly 5 items, one for each day. Respond ONLY with a raw JSON array of strings, where each string combines the day and activity. Example: ["Day 1: Arrive and explore the city center.", "Day 2: Visit the national museum..."]`;
    const suggestions = await callGemini(prompt);
    
    res.json({ data: suggestions });
  } catch (error) {
    console.error('AI Itinerary Error:', error.message);
    res.status(500).json({ error: 'Failed to generate itinerary suggestions' });
  }
});

// 2. GET /api/ai/attractions?place=PLACE_NAME
router.get('/attractions', async (req, res) => {
  try {
    const { place } = req.query;
    if (!place) {
      return res.status(400).json({ error: 'Place is required' });
    }

    const prompt = `List exactly 5 popular tourist attractions in ${place} with one-line descriptions. Respond ONLY with a raw JSON array of strings, where each string is the attraction and description combined. Example: ["Eiffel Tower - Iconic iron lattice tower in Paris.", "Louvre Museum - World's largest art museum."]`;
    const attractions = await callGemini(prompt);
    
    res.json({ data: attractions });
  } catch (error) {
    console.error('AI Attractions Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch attractions' });
  }
});

// 3. GET /api/ai/trending
router.get('/trending', async (req, res) => {
  try {
    const prompt = 'Suggest exactly 5 trending travel destinations in 2026 with a short reason for each. Respond ONLY with a raw JSON array of strings, where each string combines the destination and the reason into a single fluent sentence without any bold markdown formatting. Example: ["Kyoto, Japan - Renowned for its classical Buddhist temples, as well as gardens, imperial palaces, Shinto shrines and traditional wooden houses.", "Santorini, Greece - Famous for its stunning sunsets, white-washed buildings, and crystal clear waters."]';
    const trending = await callGemini(prompt);
    
    res.json({ data: trending });
  } catch (error) {
    console.error('AI Trending Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. GET /api/ai/suggestions?q=QUERY
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ data: [] });
    }
    
    // Using Option 1 (Simple mock suggestions) as recommended
    const lowerQ = q.toLowerCase();
    const mockDb = [
      "Paris, France", "Parikia, Greece", "Pattaya, Thailand", "Prague, Czech Republic",
      "Tokyo, Japan", "Toronto, Canada", "Taipei, Taiwan",
      "London, UK", "Lisbon, Portugal", "Los Angeles, USA",
      "New York, USA", "New Delhi, India", "Naples, Italy",
      "Rome, Italy", "Rio de Janeiro, Brazil", "Reykjavik, Iceland"
    ];
    
    const matched = mockDb.filter(place => place.toLowerCase().startsWith(lowerQ) || place.toLowerCase().includes(lowerQ)).slice(0, 5);
    res.json({ data: matched });
  } catch (error) {
    console.error('AI Suggestions Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

module.exports = router;
