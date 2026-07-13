require('dotenv').config();
const { estimateCost } = require('./server/services/costEstimationService');

async function simulateTrip(scenarioName, params) {
    console.log(`--- Scenario: ${scenarioName} ---`);
    console.log(`Params:`, params);
    const result = await estimateCost(params);
    console.log(`Total Estimated: $${result.totalEstimated}`);
    console.log(`Per Person: $${result.perPerson}`);
    console.log(`Breakdown:`, result.breakdown);
    console.log(`Cost Level: ${result.costLevel}`);
    console.log('-----------------------------\n');
    return result;
}

// 1. Luxury Trip to Zurich (Expensive City)
// 2 people, 5 days
const luxuryZurich = {
    destination: 'Zurich',
    duration: 5,
    travelerCount: 2,
    travelStyle: 'luxury',
};

(async () => {
    await simulateTrip('Luxury Zurich (2 people, 5 days)', luxuryZurich);
})();

// Comparison logic (Mental check based on old logic described as "inflated")
// OLD logic often did styleMult * destMult WITHOUT cap, and didn't share rooms.
// If styleMult=2.5 and destMult=2.0, combined was 5.0.
// Base accommodation was $45.
// Total daily base = 25+45+30+20+10 = 130.
// Old Total: (130 * 5 * 2) * 5 = $6,500 (Roughly)
// NEW logic: combinedMult = min(3.0, 2.5 * 2.0) = 3.0.
// dailyTransport = 25 * 3 = 75
// dailyFood = 30 * 3 = 90
// dailyAct = 20 * 3 = 60
// dailyMisc = 10 * 3 = 30
// dailyAccomBase = 45 * 3 = 135
// Total Transport = 75 * 5 * 2 = 750
// Total Accom = 135 * 5 * ceil(2/2) = 135 * 5 * 1 = 675
// Total Food = 90 * 5 * 2 = 900
// Total Act = 60 * 5 * 2 = 600
// Total Misc = 30 * 5 * 2 = 300
// Total = 750 + 675 + 900 + 600 + 300 = 3225.
// Reduction: $6500 -> $3225 (Approx 50% reduction)
