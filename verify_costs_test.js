require('dotenv').config();
const { estimateCost } = require('./server/services/costEstimationService');

const testScenarios = [
    {
        name: 'Budget Trip to Bali (Budget Style)',
        params: { destination: 'bali', duration: 7, travelerCount: 2, travelStyle: 'budget', userBudget: 500 }
    },
    {
        name: 'Balanced Trip to Paris (Balanced Style)',
        params: { destination: 'paris', duration: 5, travelerCount: 2, travelStyle: 'balanced', userBudget: 2000 }
    },
    {
        name: 'Luxury Trip to Zurich (Luxury Style)',
        params: { destination: 'zurich', duration: 4, travelerCount: 2, travelStyle: 'luxury', userBudget: 10000 }
    },
    {
        name: 'Budget Trip to Delhi (Budget Style)',
        params: { destination: 'delhi', duration: 10, travelerCount: 1, travelStyle: 'budget', userBudget: 300 }
    }
];

console.log('--- Cost Estimation Test Results ---\n');

(async () => {
    for (const scenario of testScenarios) {
        const result = await estimateCost(scenario.params);
        console.log(`Scenario: ${scenario.name}`);
        console.log(`Total Estimated: $${result.totalEstimated}`);
        console.log(`Per Person: $${result.perPerson}`);
        console.log(`Cost Level: ${result.costLevel}`);
        console.log(`Budget Warning: ${result.budgetWarning || 'None'}`);
        console.log('Breakdown:', result.breakdown);
        console.log('Tips:', result.tips);
        console.log('-----------------------------------\n');
    }
})();
