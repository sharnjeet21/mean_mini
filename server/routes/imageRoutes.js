const express = require('express');
const router = express.Router();
const { enrichWithImage } = require('../services/imageService');

router.get('/', async (req, res) => {
  try {
    const { place } = req.query;
    if (!place) {
      return res.status(400).json({ error: 'Place is required' });
    }

    const imageData = await enrichWithImage(place);
    if (!imageData) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(imageData);
  } catch (error) {
    console.error('Image Route Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

module.exports = router;
