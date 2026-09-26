const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/inquiries
router.get('/', async (req, res) => {
  try {
    const inquiries = await db.getAllInquiries();
    res.json({ success: true, count: inquiries.length, data: inquiries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/inquiries
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Please fill out your name, email, and message.'
      });
    }

    const inq = await db.createInquiry(req.body);
    res.status(201).json({
      success: true,
      message: 'Your inquiry has been successfully received. A consultant will respond within 24 hours.',
      data: inq
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/inquiries/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await db.updateInquiryStatus(req.params.id, status || 'CONTACTED');
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Inquiry not found.' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/inquiries/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.deleteInquiry(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Inquiry not found.' });
    }
    res.json({ success: true, message: 'Inquiry deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
