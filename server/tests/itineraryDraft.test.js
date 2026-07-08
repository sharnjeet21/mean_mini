'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');
const aiRoutes = require('../routes/aiRoutes');
const itineraryDraftService = require('../services/itineraryDraftService');

// Helper to make HTTP POST requests
function httpPost(port, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path: `/api/v1/ai${path}`,
        method: 'POST',
        headers
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

describe('POST /api/v1/ai/itinerary-draft', () => {
  let server, port, token;
  let originalGenerate, originalExtract;

  beforeEach((t) => {
    // Generate valid test token
    token = jwt.sign({ id: 'mockUserId', role: 'user', email: 'test@example.com' }, process.env.JWT_SECRET || 'travel_app_secret', { expiresIn: '1h' });
    
    // Mock the service
    originalGenerate = itineraryDraftService.generateItineraryDraft;
    originalExtract = itineraryDraftService.extractTripIntent;
    
    const app = express();
    app.use(express.json());
    app.use('/api/v1/ai', aiRoutes);

    return new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterEach((t) => {
    itineraryDraftService.generateItineraryDraft = originalGenerate;
    itineraryDraftService.extractTripIntent = originalExtract;
    return new Promise((resolve) => server.close(resolve));
  });

  it('should return 400 if destination is missing', async () => {
    const { status, body } = await httpPost(port, '/itinerary-draft', { duration: 4 }, token);
    assert.equal(status, 400);
    assert.equal(body.error, 'destination is required');
  });

  it('should return 400 if duration is missing', async () => {
    const { status, body } = await httpPost(port, '/itinerary-draft', { destination: 'Solan' }, token);
    assert.equal(status, 400);
    assert.equal(body.error, 'duration is required');
  });

  it('should return generated draft for valid minimal input', async () => {
    const mockDraft = {
      destination: 'Solan',
      duration: 2,
      summary: 'A short trip',
      days: []
    };
    itineraryDraftService.generateItineraryDraft = async (input) => {
      assert.equal(input.destination, 'Solan');
      assert.equal(input.duration, 2);
      return mockDraft;
    };

    const { status, body } = await httpPost(port, '/itinerary-draft', { destination: 'Solan', duration: 2 }, token);
    
    assert.equal(status, 200);
    assert.deepEqual(body, mockDraft);
  });

  it('should handle provider errors and return 503 without fake data', async () => {
    itineraryDraftService.generateItineraryDraft = async () => {
      throw new Error('Ollama connection refused');
    };

    const { status, body } = await httpPost(port, '/itinerary-draft', { destination: 'Solan', duration: 2 }, token);
    
    assert.equal(status, 503);
    assert.match(body.message, /We couldn't generate your trip draft right now/);
    assert.equal(body.details, 'Ollama connection refused');
  });

  it('should return 400 if text is missing in extract-intent', async () => {
    const { status, body } = await httpPost(port, '/extract-intent', {}, token);
    assert.equal(status, 400);
    assert.equal(body.error, 'text is required');
  });

  it('should return extracted intent for valid input text', async () => {
    const mockIntent = {
      destination: 'Solan',
      duration: 4,
      travelers: 3,
      travelStyle: 'balanced',
      interests: ['nature', 'adventure'],
      budget: 30000
    };
    itineraryDraftService.extractTripIntent = async (text) => {
      assert.equal(text, 'Solan trip');
      return mockIntent;
    };

    const { status, body } = await httpPost(port, '/extract-intent', { text: 'Solan trip' }, token);
    assert.equal(status, 200);
    assert.deepEqual(body, mockIntent);
  });
});
