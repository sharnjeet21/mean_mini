const { query, body } = require("express-validator");

const aiValidations = {
  suggestions: [query("q").isString().notEmpty()],
  itinerarySuggestions: [query("place").isString().notEmpty()],
  routePlan: [query("origin").isString().notEmpty(), query("destination").isString().notEmpty()],
  hotelSuggestions: [query("place").isString().notEmpty()],
  budgetEstimate: [
    body("destination").isString().notEmpty(),
    body("duration").isInt({ min: 1 }),
    body("travelerCount").isInt({ min: 1 }).optional(),
    body("travelStyle").isString().optional(),
  ],
  flightInfo: [query("from").isString().notEmpty(), query("to").isString().notEmpty()],
  smartPlan: [body("destination").isString().notEmpty(), body("duration").isInt({ min: 1 })],
};

module.exports = {
  aiValidations,
};