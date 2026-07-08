'use strict';

require('dotenv').config();
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');

// Ensure correct env vars are loaded
const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:latest';

console.log('--- Environment Configuration ---');
console.log(`AI_PROVIDER: ${AI_PROVIDER}`);
console.log(`OLLAMA_BASE_URL: ${OLLAMA_BASE_URL}`);
console.log(`OLLAMA_MODEL: ${OLLAMA_MODEL}`);

// Require routes
const aiRoutes = require('./server/routes/aiRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/ai', aiRoutes);

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
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = raw;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const tests = [
  {
    name: "Test 1: Solan",
    payload: {
      destination: "Solan",
      duration: 4,
      travelers: 3,
      travelStyle: "balanced",
      interests: ["nature", "adventure"],
      budget: 30000
    }
  },
  {
    name: "Test 2: Goa",
    payload: {
      destination: "Goa",
      duration: 3,
      travelers: 2,
      travelStyle: "budget",
      interests: ["beaches", "food"],
      budget: 20000
    }
  },
  {
    name: "Test 3: Jaipur",
    payload: {
      destination: "Jaipur",
      duration: 2,
      travelers: 1,
      travelStyle: "balanced",
      interests: ["history", "food"]
    }
  }
];

async function run() {
  // Generate a valid JWT token
  const token = jwt.sign(
    { id: 'mockUserId', role: 'user', email: 'test@example.com' }, 
    process.env.JWT_SECRET || 'travel_app_secret', 
    { expiresIn: '1h' }
  );

  // Start temporary test server
  const server = app.listen(0, '127.0.0.1', async () => {
    const port = server.address().port;
    console.log(`\nTest server running on port ${port}`);

    // Check Ollama Reachability
    console.log('\nChecking Ollama reachability...');
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        console.log('[Ollama] Reachable.');
      } else {
        console.warn(`[Ollama] Warning: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error(`[Ollama] Failed to connect: ${err.message}`);
      server.close();
      return;
    }

    for (const test of tests) {
      console.log(`\n==================================================`);
      console.log(`Running: ${test.name}`);
      console.log(`Payload: ${JSON.stringify(test.payload, null, 2)}`);
      
      const startTime = Date.now();
      try {
        const { status, body } = await httpPost(port, '/itinerary-draft', test.payload, token);
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        
        console.log(`Status Code: ${status}`);
        console.log(`Generation Time: ${(durationMs / 1000).toFixed(2)} seconds`);
        
        if (status !== 200) {
          console.error(`[Error Response]:`, body);
        } else {
          console.log(`[Response Body]:`);
          console.log(JSON.stringify(body, null, 2));
        }
      } catch (err) {
        console.error(`[Exception]:`, err);
      }
    }

    server.close(() => {
      console.log('\nTest server stopped.');
    });
  });
}

run();
