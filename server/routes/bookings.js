/**
 * Consultation bookings.
 *   POST   /api/bookings                  public (rate limited, validated)
 *   GET    /api/bookings/:id/calendar.ics public; :id is the booking UUID or ref_code
 *   GET    /api/bookings                  admin (?status=&search=)
 *   GET    /api/bookings/:id              admin
 *   PATCH  /api/bookings/:id              admin (status whitelist, notes)
 *   DELETE /api/bookings/:id              admin
 */
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAdmin } = require('../lib/auth');
const { validateBody, schemas } = require('../lib/validate');
const { wrap } = require('../lib/util');
const mailer = require('../services/mailer');

router.post('/', validateBody(schemas.booking), wrap(async (req, res) => {
  const booking = await db.createBooking(req.valid);
  mailer.notifyNewBooking(booking);
  res.status(201).json({
    success: true,
    message: 'Consultation session successfully requested.',
    data: booking
  });
}));

// Calendar invite: public so the confirmation screen can offer it.
// The id is an unguessable UUID or a 10-char random reference code.
function icsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

router.get('/:id/calendar.ics', wrap(async (req, res) => {
  const booking = await db.getBookingById(req.params.id);
  if (!booking) return res.status(404).type('text/plain').send('Booking not found');

  const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(String(booking.date || ''))
    ? booking.date
    : new Date().toISOString().slice(0, 10);
  const dt = dateStr.replace(/-/g, '');
  const ref = booking.ref_code || booking.id;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//THEWHY Consulting//Advisory Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@why.ng`,
    `DTSTAMP:${dt}T090000Z`,
    `DTSTART:${dt}T100000Z`,
    `DTEND:${dt}T104500Z`,
    `SUMMARY:${icsText(`THEWHY Consulting Advisory: ${booking.service || 'Management Advisory'}`)}`,
    `DESCRIPTION:${icsText(`Strategic Advisory Session with THEWHY Consulting\nClient: ${booking.clientName}\nRef: ${ref}\nFormat: ${booking.meetingType}`)}`,
    `LOCATION:${icsText('1a Hughes Avenue Alagomeji, Yaba, Lagos / Virtual')}`,
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const safeRef = String(ref).replace(/[^A-Za-z0-9-]/g, '');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeRef}-session.ics"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(ics);
}));

// ---- Admin only below ----
router.get('/', requireAdmin, wrap(async (req, res) => {
  const bookings = await db.getAllBookings({
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined
  });
  res.json({ success: true, count: bookings.length, data: bookings });
}));

router.get('/:id', requireAdmin, wrap(async (req, res) => {
  const booking = await db.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
  res.json({ success: true, data: booking });
}));

router.patch('/:id', requireAdmin, validateBody(schemas.bookingUpdate, { partial: true }), wrap(async (req, res) => {
  const updated = await db.updateBooking(req.params.id, req.valid);
  if (!updated) return res.status(404).json({ success: false, error: 'Booking not found' });
  res.json({ success: true, message: 'Booking updated successfully', data: updated });
}));

router.delete('/:id', requireAdmin, wrap(async (req, res) => {
  const deleted = await db.deleteBooking(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Booking not found' });
  res.json({ success: true, message: 'Booking deleted successfully' });
}));

module.exports = router;
