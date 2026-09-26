const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/bookings - list bookings
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const bookings = await db.getAllBookings({ status, search });
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bookings/:id - single booking
router.get('/:id', async (req, res) => {
  try {
    const booking = await db.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/bookings - create new booking
router.post('/', async (req, res) => {
  try {
    const { clientName, email, phone } = req.body;

    if (!clientName || !email || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide client name, email, and phone number.'
      });
    }

    const newBooking = await db.createBooking(req.body);

    res.status(201).json({
      success: true,
      message: 'Consultation session successfully requested.',
      data: newBooking
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/bookings/:id - update booking status or notes
router.patch('/:id', async (req, res) => {
  try {
    const updated = await db.updateBooking(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    res.json({ success: true, message: 'Booking updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/bookings/:id - delete booking
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.deleteBooking(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bookings/:id/calendar.ics - generate calendar invite
router.get('/:id/calendar.ics', async (req, res) => {
  try {
    const booking = await db.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).send('Booking not found');
    }

    const dateStr = booking.date ? String(booking.date).split('T')[0] : new Date().toISOString().split('T')[0];
    const dt = dateStr.replace(/-/g, '');
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//THEWHY Consulting//Advisory Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${booking.id || booking.ref_code}@why.ng`,
      `DTSTAMP:${dt}T090000Z`,
      `DTSTART:${dt}T100000Z`,
      `DTEND:${dt}T104500Z`,
      `SUMMARY:THEWHY Consulting Advisory: ${booking.service || 'Management Advisory'}`,
      `DESCRIPTION:Strategic Advisory Session with THEWHY Consulting\\nClient: ${booking.clientName}\\nRef: ${booking.ref_code || booking.id}\\nFormat: ${booking.meetingType}`,
      'LOCATION:1a Hughes Avenue Alagomeji, Yaba, Lagos / Virtual',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${booking.ref_code || booking.id}-session.ics"`);
    res.send(icsContent);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
