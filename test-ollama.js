'use strict';
require('dotenv').config();
const { getAiProvider } = require('./server/services/aiProviderResolver');
const provider = getAiProvider();

const scenarios = [
  { destination: "Solan", duration: 4, travelers: 3, travelStyle: "balanced", interests: ["nature", "adventure"], budget: 300 },
  { destination: "Goa", duration: 3, travelers: 2, travelStyle: "budget", interests: ["beaches", "food"], budget: 20000 },
  { destination: "Jaipur", duration: 2, travelers: 1, travelStyle: "balanced", interests: ["history", "food"] },
  { destination: "Kerala", duration: 7, travelers: 4, travelStyle: "relaxed", interests: ["nature", "culture"] }
];

async function run() {
  for (const [i, scenario] of scenarios.entries()) {
    console.log(`\n--- Scenario ${i + 1}: ${scenario.destination} for ${scenario.duration} days ---`);
    try {
      const result = await provider.generateItineraryDraft(scenario);
      console.log(JSON.stringify(result, null, 2).substring(0, 500) + '\n... [TRUNCATED]');
      console.log(`[Success] Generated ${result.days?.length} days.`);
    } catch (err) {
      console.error(`[Error] ${err.message}`);
    }
  }
}

run();
