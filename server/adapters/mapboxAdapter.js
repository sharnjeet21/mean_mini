// Ponytail: Deleted over-engineered class and types.js hierarchy. Native fetch is enough.
'use strict';

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || 'mock_token';
const aiProvider = require('../services/aiProvider');

async function geocode(place) {
  if (MAPBOX_TOKEN && MAPBOX_TOKEN !== 'mock_token') {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data?.features?.length) {
          const feature = data.features[0];
          const [lng, lat] = feature.center || [];
          if (typeof lat === 'number' && typeof lng === 'number') {
            return {
              name: feature.place_name || place,
              lat,
              lng,
              bbox: Array.isArray(feature.bbox) ? feature.bbox : null
            };
          }
        }
      }
    } catch (err) {
      console.warn('[mapboxAdapter] Mapbox geocoding failed, trying AI/Nominatim fallback:', err.message);
    }
  }

  // Try Nominatim (OpenStreetMap) - completely free, highly accurate, no key required
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TravelIntelligencePlatform/1.0'
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          const bbox = Array.isArray(result.boundingbox) && result.boundingbox.length === 4
            ? [parseFloat(result.boundingbox[2]), parseFloat(result.boundingbox[0]), parseFloat(result.boundingbox[3]), parseFloat(result.boundingbox[1])]
            : null;
          return {
            name: result.display_name || place,
            lat,
            lng,
            bbox
          };
        }
      }
    }
  } catch (err) {
    console.warn('[mapboxAdapter] Nominatim geocoding failed, trying AI:', err.message);
  }

  // Fallback to AI geocoding
  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await aiProvider.geocodeLocation(place);
      if (result && typeof result.lat === 'number' && typeof result.lng === 'number') {
        return result;
      }
    } catch (err) {
      console.error('[mapboxAdapter] AI geocoding fallback failed:', err.message);
    }
  }

  // Final fallback (mock coords) if everything fails
  console.warn('[mapboxAdapter] Using hardcoded/mock fallback coordinates for:', place);
  return {
    name: place,
    lat: 25.0,
    lng: 45.0,
    bbox: null
  };
}

async function getDirections(origin, destination, mode = 'driving') {
  const profile = mode === 'driving' ? 'driving' : mode === 'cycling' ? 'cycling' : 'walking';
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Mapbox Directions API failed: HTTP ${response.status}`);
  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes?.length) throw new Error(`No route found for mode '${mode}'`);

  const route = data.routes[0];
  return {
    originName: origin.name || 'Origin',
    destinationName: destination.name || 'Destination',
    durationMin: Math.ceil(route.duration / 60) || 1,
    distanceKm: Number((route.distance / 1000).toFixed(2)) || 0.1,
    mode: profile,
    geometry: route.geometry,
  };
}

module.exports = { geocode, getDirections };
