/**
 * Newsletter subscription (public).
 *   POST /api/newsletter        body { email, name?, source? }
 *   POST /api/stats/newsletter  legacy alias, same behaviour
 * Subscribers are stored (deduplicated by email) and listed in the admin console.
 */
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { validateBody, schemas } = require('../lib/validate');
const { wrap } = require('../lib/util');

router.post('/', validateBody(schemas.newsletter), wrap(async (req, res) => {
  await db.addSubscriber(req.valid);
  // Same response whether new or already subscribed (no email enumeration).
  res.json({
    success: true,
    message: 'Thank you for subscribing to THEWHY Executive Advisory Briefs.'
  });
}));

module.exports = router;
