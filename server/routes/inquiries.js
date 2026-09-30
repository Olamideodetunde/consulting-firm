/**
 * Service inquiries and launch / bootcamp applications.
 *   POST   /api/inquiries             public (rate limited, validated; accepts `company`)
 *   GET    /api/inquiries             admin
 *   PATCH  /api/inquiries/:id/status  admin, body { status: NEW|CONTACTED|RESPONDED|CLOSED }
 *   PATCH  /api/inquiries/:id         admin, same as above
 *   DELETE /api/inquiries/:id         admin
 */
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAdmin } = require('../lib/auth');
const { validateBody, schemas } = require('../lib/validate');
const { wrap } = require('../lib/util');
const mailer = require('../services/mailer');

router.post('/', validateBody(schemas.inquiry), wrap(async (req, res) => {
  const inq = await db.createInquiry(req.valid);
  mailer.notifyNewInquiry(inq);
  res.status(201).json({
    success: true,
    message: 'Your inquiry has been successfully received. A consultant will respond within 24 hours.',
    data: inq
  });
}));

router.get('/', requireAdmin, wrap(async (req, res) => {
  const inquiries = await db.getAllInquiries();
  res.json({ success: true, count: inquiries.length, data: inquiries });
}));

const updateStatus = wrap(async (req, res) => {
  const updated = await db.updateInquiryStatus(req.params.id, req.valid.status || 'CONTACTED');
  if (!updated) return res.status(404).json({ success: false, error: 'Inquiry not found.' });
  res.json({ success: true, data: updated });
});
router.patch('/:id/status', requireAdmin, validateBody(schemas.inquiryUpdate), updateStatus);
router.patch('/:id', requireAdmin, validateBody(schemas.inquiryUpdate), updateStatus);

router.delete('/:id', requireAdmin, wrap(async (req, res) => {
  const deleted = await db.deleteInquiry(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Inquiry not found.' });
  res.json({ success: true, message: 'Inquiry deleted successfully.' });
}));

module.exports = router;
