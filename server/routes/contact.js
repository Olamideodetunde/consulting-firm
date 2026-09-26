/**
 * Contact Submissions Route
 * Handles message submissions from contact page and general queries.
 */
const express = require('express');
const router = express.Router();
const db = require('../db/db');

// POST /api/contact - submit contact message
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your name, email address, and message.'
      });
    }

    const submission = await db.createContact({ name, email, phone, subject, message });

    res.status(201).json({
      success: true,
      message: 'Message received. A consultant from our Lagos office will respond shortly.',
      ref_code: submission.ref_code,
      data: submission
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/contact - list all messages (admin access)
router.get('/', async (req, res) => {
  try {
    const submissions = await db.getAllContacts();
    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
