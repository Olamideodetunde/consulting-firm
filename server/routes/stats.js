const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/stats - dashboard summary metrics
router.get('/', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stats/export/bookings.csv - download CSV report
router.get('/export/bookings.csv', async (req, res) => {
  try {
    const bookings = await db.getAllBookings();

    const headers = [
      'Booking ID',
      'Client Name',
      'Company Name',
      'Email',
      'Phone',
      'Service',
      'Format',
      'Date',
      'Time Slot',
      'Status',
      'Estimated Fee',
      'Created At'
    ];

    const rows = bookings.map(b => [
      `"${b.id || b.ref_code}"`,
      `"${(b.clientName || '').replace(/"/g, '""')}"`,
      `"${(b.companyName || '').replace(/"/g, '""')}"`,
      `"${b.email || ''}"`,
      `"${b.phone || ''}"`,
      `"${(b.service || '').replace(/"/g, '""')}"`,
      `"${(b.meetingType || '').replace(/"/g, '""')}"`,
      `"${b.date || ''}"`,
      `"${b.timeSlot || ''}"`,
      `"${b.status || ''}"`,
      `"${(b.estimatedFee || '').replace(/"/g, '""')}"`,
      `"${b.createdAt || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="THEWHY_Consultation_Bookings.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/newsletter
router.post('/newsletter', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Please provide a valid corporate email.' });
  }
  res.json({
    success: true,
    message: 'Thank you for subscribing to THEWHY Executive Advisory Briefs.'
  });
});

module.exports = router;
