/**
 * Admin dashboard stats and exports (all routes require an admin session).
 *   GET /api/stats
 *   GET /api/stats/export/bookings.csv
 */
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAdmin } = require('../lib/auth');
const { wrap, toCsv } = require('../lib/util');

router.use(requireAdmin);

router.get('/', wrap(async (req, res) => {
  const stats = await db.getStats();
  res.json({ success: true, data: stats });
}));

const BOOKING_CSV_HEADERS = [
  'Reference', 'Booking ID', 'Client Name', 'Company Name', 'Email', 'Phone', 'Service', 'Format',
  'Date', 'Time Slot', 'Company Size', 'Status', 'Estimated Fee', 'Message', 'Notes', 'Created At'
];

function bookingsToCsv(bookings) {
  return toCsv(BOOKING_CSV_HEADERS, bookings.map(b => [
    b.ref_code, b.id, b.clientName, b.companyName, b.email, b.phone, b.service, b.meetingType,
    b.date, b.timeSlot, b.companySize, b.status, b.estimatedFee, b.message, b.notes, b.createdAt
  ]));
}

router.get('/export/bookings.csv', wrap(async (req, res) => {
  const bookings = await db.getAllBookings({
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="THEWHY_Consultation_Bookings.csv"');
  res.setHeader('Cache-Control', 'private, no-store');
  // BOM so Excel opens UTF-8 (Naira sign, accents) correctly.
  res.send(String.fromCharCode(0xfeff) + bookingsToCsv(bookings));
}));

module.exports = router;
module.exports.bookingsToCsv = bookingsToCsv;
