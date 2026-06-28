const express = require("express");
const { chatWithAI, sendEmail, exportItineraryPDF, googleOAuthStart, googleOAuthCallback } = require("../controllers/bonusController");

const router = express.Router();

router.post("/chat", chatWithAI);
router.post("/email/send", sendEmail);
router.post("/pdf/export", exportItineraryPDF);
router.get("/oauth/google/start", googleOAuthStart);
router.get("/oauth/google/callback", googleOAuthCallback);

module.exports = router;