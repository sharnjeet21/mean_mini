'use strict';

/**
 * Unit tests for server/routes/aiRoutes.js
 * Uses Node.js built-in test runner (node:test) and node:assert/strict.
 *
 * Strategy:
 *  - Mount aiRoutes on a minimal Express app
 *  - Override globalThis.fetch to mock Unsplash / Gemini calls
 *  - Make HTTP requests using Node's http module (bypasses fetch mock)
 *  - Restore globalThis.fetch after each test
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

// ── Helpers ───────────────────────────────────────────────────────────────────

function createApp() {
  // Route configuration is read at module load. Tests use mocked network calls,
  // but still provide non-secret placeholder keys to exercise the configured path.
  process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash-key';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.AI_PROVIDER = 'gemini';

  const resolver = require('../services/aiProviderResolver');
  const GeminiProvider = require('../services/providers/geminiProvider');
  const gemini = new GeminiProvider({ apiKey: 'test-gemini-key' });
  resolver.getAiProvider = () => ({
    generateStructuredTravelSearch: (q) => gemini.generateStructuredTravelSearch(q),
    generateTrendingDestinations: () => gemini.generateTrendingDestinations(),
    generateItinerarySuggestions: (d) => gemini.generateItinerarySuggestions(d),
    generateAutocompleteSuggestions: (q) => gemini.generateAutocompleteSuggestions(q),
    getMetadata: () => ({
      currentProvider: 'Gemini',
      availableProviders: ['Gemini'],
      providerHealth: { Gemini: 'healthy' },
      lastInitializationResult: 'Mocked for testing'
    })
  });

  const routePath = require.resolve('../routes/aiRoutes');
  const cachePath = require.resolve('../utils/inMemoryCache');
  const ratePath  = require.resolve('../middleware/rateLimiter');
  delete require.cache[routePath];
  delete require.cache[cachePath];
  delete require.cache[ratePath];
  const aiRoutes = require('../routes/aiRoutes');
  const app = express();
  app.use(express.json());
  app.use('/', aiRoutes);
  return app;
}

function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}` });
    });
    server.on('error', reject);
  });
}

function stopServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

function httpGet(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let body;
        try { body = JSON.parse(raw); } catch { body = raw; }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function httpPost(port, path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function mockFetchReturning(body, status = 200) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function geminiMock(text) {
  return mockFetchReturning({
    candidates: [{ content: { parts: [{ text }] } }],
  });
}

// ── /image route ──────────────────────────────────────────────────────────────
describe('GET /image', { concurrency: false }, () => {
  it('returns 200 + { url } + X-Cache: MISS on first call', async () => {
    const app = createApp();
    const { server, port } = await startServer(app);
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = mockFetchReturning({
        results: [{ urls: { regular: 'https://example.com/img.jpg' } }],
      });
      const { status, headers, body } = await httpGet(port, '/image?place=Paris');
      assert.equal(status, 200);
      assert.equal(body.url, 'https://example.com/img.jpg');
      assert.equal(headers['x-cache'], 'MISS');
    } finally {
      globalThis.fetch = originalFetch;
      await stopServer(server);
    }
  });

  it('returns same URL + X-Cache: HIT on second call (cache hit)', async () => {
    const app = createApp();
    const { server, port } = await startServer(app);
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = mockFetchReturning({
        results: [{ urls: { regular: 'https://example.com/img.jpg' } }],
      });
      await httpGet(port, '/image?place=Paris');
      globalThis.fetch = async () => { throw new Error('fetch should not be called on cache hit'); };
      const { status, headers, body } = await httpGet(port, '/image?place=Paris');
      assert.equal(status, 200);
      assert.equal(body.url, 'https://example.com/img.jpg');
      assert.equal(headers['x-cache'], 'HIT');
    } finally {
      globalThis.fetch = originalFetch;
      await stopServer(server);
    }
  });

  it('returns 404 when Unsplash returns empty results', async () => {
    const app = createApp();
    const { server, port } = await startServer(app);
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = mockFetchReturning({ results: [] });
      const { status } = await httpGet(port, '/image?place=Nowhere');
      assert.equal(status, 404);
    } finally {
      globalThis.fetch = originalFetch;
      await stopServer(server);
    }
  });
});

// ── /suggestions route ────────────────────────────────────────────────────────
describe('GET /suggestions', { concurrency: false }, () => {
  it('returns 200 + { suggestions } + X-Cache: MISS on first call with local matching', async () => {
    const app = createApp();
    const { server, port } = await startServer(app);
    try {
      const { status, headers, body } = await httpGet(port, '/suggestions?q=Pa');
      assert.equal(status, 200);
      assert.ok(Array.isArray(body.suggestions), 'suggestions should be an array');
      assert.ok(body.suggestions.length > 0, 'should have at least one match for "Pa"');
      assert.ok(body.suggestions.some(s => s.startsWith('Paris')), 'should include Paris match');
      assert.equal(headers['x-cache'], 'MISS');
    } finally {
      await stopServer(server);
    }
  });

  it('returns same suggestions + X-Cache: HIT on second call', async () => {
    const app = createApp();
    const { server, port } = await startServer(app);
    try {
      const firstResponse = await httpGet(port, '/suggestions?q=Pa');
      const { status, headers, body } = await httpGet(port, '/suggestions?q=Pa');
      assert.equal(status, 200);
      assert.deepEqual(body.suggestions, firstResponse.body.suggestions);
      assert.equal(headers['x-cache'], 'HIT');
    } finally {
      await stopServer(server);
    }
  });

  it('returns empty array for query with no matches', async () => {
    const app = createApp();
    const { server, port } = await startServer(app);
    try {
      const { status, body } = await httpGet(port, '/suggestions?q=Zzzzxy');
      assert.equal(status, 200);
      assert.deepEqual(body.suggestions, []);
    } finally {
      await stopServer(server);
    }
  });

  it('returns 400 for single-character query', async () => {
    const app = createApp();
    const { server, port } = await startServer(app);
    try {
      const { status } = await httpGet(port, '/suggestions?q=x');
      assert.equal(status, 400);
    } finally {
      await stopServer(server);
    }
  });
});

// ── /trending route ───────────────────────────────────────────────────────────
describe('GET /trending', { concurrency: false }, () => {
  const mockDestinations = [
    { name: 'Tokyo',    description: 'A vibrant city blending tradition and modernity.' },
    { name: 'Lisbon',   description: 'Charming coastal city with rich history.' },
    { name: 'Bali',     description: 'Tropical paradise with stunning temples.' },
    { name: 'Medellin', description: 'City of eternal spring in Colombia.' },
    { name: 'Tbilisi',  description: 'Ancient city with unique architecture.' },
  ];

  it('returns 200 + { destinations } + X-Cache: MISS on first call', async () => {
    const app = createApp();
    const { server, port } = await startServer(app);
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = geminiMock(JSON.stringify(mockDestinations));
      const { status, headers, body } = await httpGet(port, '/trending');
      assert.equal(status, 200);
      assert.ok(Array.isArray(body.destinations));
      assert.equal(body.destinations.length, 5);
      assert.equal(headers['x-cache'], 'MISS');
    } finally {
      globalThis.fetch = originalFetch;
      await stopServer(server);
    }
  });
});

// ── /itinerary-suggestions route ──────────────────────────────────────────────
describe('GET /itinerary-suggestions', { concurrency: false }, () => {
  const mockAttractions = [
    { name: 'Eiffel Tower',  description: 'Iconic iron lattice tower on the Champ de Mars.' },
    { name: 'Louvre Museum', description: 'World largest art museum and historic monument.' },
    { name: 'Notre-Dame',    description: 'Medieval Catholic cathedral on the Ile de la Cite.' },
    { name: 'Montmartre',    description: 'Historic hilltop district with the Sacre-Coeur basilica.' },
    { name: 'Musee d Orsay', description: 'Museum in a former railway station housing Impressionist art.' },
  ];

  it('returns 200 + { attractions } + X-Cache: MISS on first call', async () => {
    const app = createApp();
    const { server, port } = await startServer(app);
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = geminiMock(JSON.stringify(mockAttractions));
      const { status, headers, body } = await httpGet(port, '/itinerary-suggestions?place=Paris');
      assert.equal(status, 200);
      assert.ok(Array.isArray(body.attractions));
      assert.equal(body.attractions.length, 5);
      assert.equal(headers['x-cache'], 'MISS');
    } finally {
      globalThis.fetch = originalFetch;
      await stopServer(server);
    }
  });
});

describe('POST /travel-search', { concurrency: false }, () => {
  it('returns out_of_scope for unrelated query without image enrichment', async () => {
    const app = createApp();
    const { server, port } = await startServer(app);
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => { throw new Error('fetch should not be called'); };
      const { status, body } = await httpPost(port, '/travel-search', { query: 'Write Python code' });
      assert.equal(status, 200);
      assert.equal(body.type, 'out_of_scope');
      assert.equal(body.image, null);
    } finally {
      globalThis.fetch = originalFetch;
      await stopServer(server);
    }
  });

  it('returns normalized itinerary response with image data for travel query', async () => {
    const app = createApp();
    const { server, port } = await startServer(app);
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url) => {
        if (String(url).includes('generativelanguage.googleapis.com')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              candidates: [{
                content: {
                  parts: [{
                    text: JSON.stringify({
                      type: 'itinerary',
                      destination: 'Manali, India',
                      normalizedDestination: 'Manali, India',
                      overview: 'A mountain break with scenic drives and local food.',
                      suggestedDuration: '4 days',
                      attractions: [{ name: 'Solang Valley', description: 'Adventure hub' }],
                      dayPlan: [{ day: 1, title: 'Arrival', summary: 'Settle in', places: ['Old Manali'] }],
                      travelTips: ['Carry layers'],
                      recommendations: [],
                    }),
                  }],
                },
              }],
            }),
          };
        }

        if (String(url).includes('api.unsplash.com/search/photos')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [{
                id: 'photo-1',
                urls: { regular: 'https://example.com/manali.jpg' },
                user: { name: 'A Photographer', links: { html: 'https://unsplash.com/@photographer' } },
              }],
            }),
          };
        }

        if (String(url).includes('/download?client_id=')) {
          return { ok: true, status: 200, json: async () => ({}) };
        }

        throw new Error(`Unexpected URL ${url}`);
      };

      const { status, body } = await httpPost(port, '/travel-search', { query: 'Plan a 4 day trip to Manali' });
      assert.equal(status, 200);
      assert.equal(body.type, 'itinerary');
      assert.equal(body.destination, 'Manali, India');
      assert.equal(body.image.image, 'https://example.com/manali.jpg');
      assert.deepEqual(body.dayPlan[0].places, ['Old Manali']);
    } finally {
      globalThis.fetch = originalFetch;
      await stopServer(server);
    }
  });
});
