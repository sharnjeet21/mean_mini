'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const itineraryRoutes = require('../routes/itineraryRoutes');
const Itinerary = require('../models/Itinerary');

// Helper to make HTTP PUT requests
function httpPut(port, id, body, token) {
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
        path: `/api/v1/itineraries/${id}`,
        method: 'PUT',
        headers
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

describe('PUT /api/v1/itineraries/:id (Manual Editing & Concurrency)', () => {
  let server, port;
  let travelerToken, managerToken, otherManagerToken, adminToken;
  let originalFindById, originalSave;

  beforeEach(() => {
    travelerToken = jwt.sign({ id: 'user123', role: 'user', email: 'traveler@test.com' }, process.env.JWT_SECRET || 'travel_app_secret', { expiresIn: '1h' });
    managerToken = jwt.sign({ id: 'manager456', role: 'trip-manager', email: 'manager@test.com' }, process.env.JWT_SECRET || 'travel_app_secret', { expiresIn: '1h' });
    otherManagerToken = jwt.sign({ id: 'manager789', role: 'trip-manager', email: 'othermanager@test.com' }, process.env.JWT_SECRET || 'travel_app_secret', { expiresIn: '1h' });
    adminToken = jwt.sign({ id: 'admin999', role: 'admin', email: 'admin@test.com' }, process.env.JWT_SECRET || 'travel_app_secret', { expiresIn: '1h' });

    originalFindById = Itinerary.findById;
    originalSave = Itinerary.prototype.save;

    const app = express();
    app.use(express.json());
    app.use('/api/v1/itineraries', itineraryRoutes);

    return new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterEach(() => {
    Itinerary.findById = originalFindById;
    Itinerary.prototype.save = originalSave;
    return new Promise((resolve) => server.close(resolve));
  });

  it('should reject unauthorized edits by non-owner travelers', async () => {
    const mockItinerary = {
      _id: '507f1f77bcf86cd799439011',
      createdBy: 'manager456',
      title: 'Original Title',
      destination: 'Paris',
      status: 'draft',
      toObject() { return this; }
    };
    Itinerary.findById = () => mockItinerary;

    const { status, body } = await httpPut(port, mockItinerary._id, { title: 'New Title' }, travelerToken);
    assert.equal(status, 403);
    assert.match(body.message, /Insufficient permissions/);
  });

  it('should reject traveler edits on published itineraries even if owner', async () => {
    const mockItinerary = {
      _id: '507f1f77bcf86cd799439011',
      createdBy: 'user123',
      title: 'Original Title',
      destination: 'Paris',
      status: 'published',
      toObject() { return this; }
    };
    Itinerary.findById = () => mockItinerary;

    const { status, body } = await httpPut(port, mockItinerary._id, { title: 'New Title' }, travelerToken);
    assert.equal(status, 403);
    assert.match(body.message, /Travelers cannot edit published itineraries/);
  });

  it('should allow trip-managers to edit their own published itineraries', async () => {
    const mockItinerary = {
      _id: '507f1f77bcf86cd799439011',
      createdBy: 'manager456',
      title: 'Original Title',
      destination: 'Paris',
      status: 'published',
      toObject() { return this; },
      populate: async () => {},
      save: async function() { return this; }
    };
    Itinerary.findById = () => mockItinerary;

    const { status, body } = await httpPut(port, mockItinerary._id, { title: 'Updated Manager Title' }, managerToken);
    assert.equal(status, 200);
    assert.equal(body.title, 'Updated Manager Title');
  });

  it('should reject edit if trip manager does not own the itinerary', async () => {
    const mockItinerary = {
      _id: '507f1f77bcf86cd799439011',
      createdBy: 'manager456',
      title: 'Original Title',
      destination: 'Paris',
      status: 'published',
      toObject() { return this; }
    };
    Itinerary.findById = () => mockItinerary;

    const { status, body } = await httpPut(port, mockItinerary._id, { title: 'Updated Title' }, otherManagerToken);
    assert.equal(status, 403);
    assert.match(body.message, /Insufficient permissions/);
  });

  it('should reject stale concurrency updates', async () => {
    const mockItinerary = {
      _id: '507f1f77bcf86cd799439011',
      createdBy: 'manager456',
      title: 'Original Title',
      destination: 'Paris',
      status: 'published',
      updatedAt: new Date('2026-07-09T20:00:00Z'),
      toObject() { return this; }
    };
    Itinerary.findById = () => mockItinerary;

    // Send a stale updatedAt date
    const { status, body } = await httpPut(
      port, 
      mockItinerary._id, 
      { title: 'Updated Title', updatedAt: '2026-07-09T18:00:00Z' }, 
      managerToken
    );
    assert.equal(status, 409);
    assert.match(body.message, /modified by another process/);
  });

  it('should reject malformed daily plan or empty activity name', async () => {
    const mockItinerary = {
      _id: '507f1f77bcf86cd799439011',
      createdBy: 'manager456',
      title: 'Original Title',
      destination: 'Paris',
      status: 'published',
      toObject() { return this; }
    };
    Itinerary.findById = () => mockItinerary;

    const malformedPayload = {
      title: 'Updated Title',
      dailyPlan: [
        {
          day: 1,
          title: 'Day 1',
          activities: [
            { activity: ' ' } // blank name
          ]
        }
      ]
    };

    const { status, body } = await httpPut(port, mockItinerary._id, malformedPayload, managerToken);
    assert.equal(status, 400);
    assert.match(body.message, /must have a name/);
  });
});
