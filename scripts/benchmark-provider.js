'use strict';
require('dotenv').config();
const { getAiProvider } = require('../server/services/aiProviderResolver');

async function benchmark() {
  console.log('=== AI Provider Benchmark ===');
  const provider = getAiProvider();
  console.log(`Testing active provider: ${process.env.AI_PROVIDER || 'ollama'}`);
  const startTime = Date.now();
  try {
    const result = await provider.generateItineraryDraft({
      destination: "Kyoto",
      duration: 3,
      travelers: 2,
      travelStyle: "balanced",
      interests: ["culture"]
    });
    const duration = (Date.now() - startTime) / 1000;
    console.log(`[PASS] Benchmark successful in ${duration.toFixed(2)}s`);
    console.log(`[INFO] Days generated: ${result?.days?.length || 0}`);
  } catch (error) {
    console.error(`[FAIL] Benchmark failed: ${error.message}`);
  }
}

benchmark();
