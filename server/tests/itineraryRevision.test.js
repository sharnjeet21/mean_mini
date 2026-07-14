'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const aiRoutes = require('../routes/aiRoutes');
const itineraryDraftService = require('../services/itineraryDraftService');
const Itinerary = require('../models/Itinerary');

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

describe('POST /api/v1/ai/itinerary-revision', () => {
  let server, port, token, otherToken, adminToken;
  let originalFindById, originalReviseItinerary;

  beforeEach((t) => {
    token = jwt.sign({ id: 'user123', role: 'trip-manager', email: 'test@example.com' }, process.env.JWT_SECRET || 'travel_app_secret', { expiresIn: '1h' });
    otherToken = jwt.sign({ id: 'user456', role: 'user', email: 'other@example.com' }, process.env.JWT_SECRET || 'travel_app_secret', { expiresIn: '1h' });
    adminToken = jwt.sign({ id: 'admin123', role: 'admin', email: 'admin@example.com' }, process.env.JWT_SECRET || 'travel_app_secret', { expiresIn: '1h' });

    originalFindById = Itinerary.findById;
    originalReviseItinerary = itineraryDraftService.reviseItinerary;

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
    Itinerary.findById = originalFindById;
    itineraryDraftService.reviseItinerary = originalReviseItinerary;
    return new Promise((resolve) => server.close(resolve));
  });

  it('should return 400 if itineraryId is missing', async () => {
    const { status, body } = await httpPost(port, '/itinerary-revision', { instruction: 'Make it cheaper' }, token);
    assert.equal(status, 400);
    assert.equal(body.error, 'itineraryId is required');
  });

  it('should return 400 if instruction is missing', async () => {
    const { status, body } = await httpPost(port, '/itinerary-revision', { itineraryId: '507f1f77bcf86cd799439011' }, token);
    assert.equal(status, 400);
    assert.equal(body.error, 'instruction is required');
  });

  it('should return 403 if user is not the owner and not admin', async () => {
    const mockItinerary = {
      _id: '507f1f77bcf86cd799439011',
      createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'), // owner is user123 (but we check string comparison in routes, which matches owner)
      title: 'Trip to Paris',
      destination: 'Paris'
    };

    Itinerary.findById = () => ({
      ...mockItinerary,
      createdBy: 'user456' // let's mock it so owner is user456, but requester is user123
    });

    const { status, body } = await httpPost(port, '/itinerary-revision', {
      itineraryId: '507f1f77bcf86cd799439011',
      instruction: 'Make it cheaper'
    }, token);

    assert.equal(status, 403);
    assert.match(body.message, /Insufficient permissions/);
  });

  it('should return revised plan if user is the owner', async () => {
    const mockItinerary = {
      _id: '507f1f77bcf86cd799439011',
      createdBy: 'user123',
      title: 'Trip to Paris',
      destination: 'Paris',
      dailyPlan: []
    };

    Itinerary.findById = () => mockItinerary;

    const mockRevised = {
      title: 'Trip to Paris (Budget)',
      destination: 'Paris',
      duration: 3,
      budget: 1500,
      description: 'Cheaper paris trip',
      dailyPlan: [],
      tripSummary: { highlights: [] }
    };

    itineraryDraftService.reviseItinerary = async (itinerary, instruction) => {
      assert.equal(instruction, 'Make it cheaper');
      return mockRevised;
    };

    const { status, body } = await httpPost(port, '/itinerary-revision', {
      itineraryId: '507f1f77bcf86cd799439011',
      instruction: 'Make it cheaper'
    }, token);

    assert.equal(status, 200);
    assert.deepEqual(body, mockRevised);
  });

  it('should return revised plan if user is an admin', async () => {
    const mockItinerary = {
      _id: '507f1f77bcf86cd799439011',
      createdBy: 'user123',
      title: 'Trip to Paris',
      destination: 'Paris',
      dailyPlan: []
    };

    Itinerary.findById = () => mockItinerary;

    const mockRevised = {
      title: 'Trip to Paris (Budget)',
      destination: 'Paris',
      duration: 3,
      budget: 1500,
      description: 'Cheaper paris trip',
      dailyPlan: [],
      tripSummary: { highlights: [] }
    };

    itineraryDraftService.reviseItinerary = async () => mockRevised;

    const { status, body } = await httpPost(port, '/itinerary-revision', {
      itineraryId: '507f1f77bcf86cd799439011',
      instruction: 'Make it cheaper'
    }, adminToken);

    assert.equal(status, 200);
    assert.deepEqual(body, mockRevised);
  });
});
