const express = require('express');
const router = express.Router();

// Placeholder for future bonus features (affiliates/rewards/loyalty)
router.get('/health', (req, res) => {
  res.json({ status: 'active', service: 'bonus' });
});

module.exports = router;
