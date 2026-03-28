const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { requireAuth } = require('../middleware/auth');

// GET /api/events — List all events
router.get('/', requireAuth, (req, res) => {
  res.json({ events: store.events });
});

module.exports = router;
