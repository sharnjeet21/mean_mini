const jwt = require("jsonwebtoken");

async function chatWithAI(req, res, next) {
  try {
    const { message, context } = req.body;
    res.json({
      reply: `AI received: "${message}". Configure GEMINI_API_KEY for live responses.`,
      context: context || {},
    });
  } catch (err) {
    next(err);
  }
}

async function sendEmail(req, res, next) {
  try {
    const { to, subject, body } = req.body;
    res.json({ success: true, message: `Email queued to ${to}` });
  } catch (err) {
    next(err);
  }
}

async function exportItineraryPDF(req, res, next) {
  try {
    const { itineraryId } = req.body;
    res.json({
      success: true,
      pdfUrl: `/api/v1/bonus/pdf/${itineraryId || "sample"}`,
      message: "PDF export ready",
    });
  } catch (err) {
    next(err);
  }
}

function googleOAuthStart(req, res) {
  res.json({ url: "https://accounts.google.com/o/oauth2/v2/auth?...", message: "Implement OAuth client credentials" });
}

function googleOAuthCallback(req, res) {
  const fakeToken = jwt.sign({ provider: "google", email: "user@example.com" }, process.env.JWT_SECRET || "travel_app_secret", { expiresIn: "7d" });
  res.json({ token: fakeToken, message: "OAuth callback" });
}

module.exports = { chatWithAI, sendEmail, exportItineraryPDF, googleOAuthStart, googleOAuthCallback };