/**
 * Contact messages.
 *   POST   /api/contact      public (rate limited, validated)
 *   GET    /api/contact      admin
 *   PATCH  /api/contact/:id  admin, body { status: unread|read|responded|archived }
 *   DELETE /api/contact/:id  admin
 */
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAdmin } = require('../lib/auth');
const { validateBody, schemas } = require('../lib/validate');
const { wrap } = require('../lib/util');
const mailer = require('../services/mailer');

router.post('/', validateBody(schemas.contact), wrap(async (req, res) => {
  const submission = await db.createContact(req.valid);
  mailer.notifyNewContact(submission);
  res.status(201).json({
    success: true,
    message: 'Message received. A consultant from our Lagos office will respond shortly.',
    ref_code: submission.ref_code,
    data: submission
  });
}));

router.get('/', requireAdmin, wrap(async (req, res) => {
  const submissions = await db.getAllContacts();
  res.json({ success: true, count: submissions.length, data: submissions });
}));

router.patch('/:id', requireAdmin, validateBody(schemas.contactUpdate), wrap(async (req, res) => {
  const updated = await db.updateContactStatus(req.params.id, req.valid.status);
  if (!updated) return res.status(404).json({ success: false, error: 'Message not found.' });
  res.json({ success: true, data: updated });
}));

router.delete('/:id', requireAdmin, wrap(async (req, res) => {
  const deleted = await db.deleteContact(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Message not found.' });
  res.json({ success: true, message: 'Message deleted successfully.' });
}));

module.exports = router;
