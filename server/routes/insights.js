/**
 * Insights / blog articles.
 *   GET    /api/insights        public, published articles only
 *   GET    /api/insights/:slug  public; drafts are only visible to a signed-in admin
 *   POST   /api/insights        admin
 *   PUT    /api/insights/:slug  admin
 *   DELETE /api/insights/:slug  admin
 *
 * Article bodies can be long, so this router parses JSON itself with a larger
 * limit, and only after the admin check (the global parser skips /api/insights).
 */
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAdmin, isAdminRequest } = require('../lib/auth');
const { validateBody, schemas } = require('../lib/validate');
const { wrap } = require('../lib/util');

const articleJson = express.json({ limit: '300kb' });

router.get('/', wrap(async (req, res) => {
  const articles = await db.getAllInsights();
  res.json({ success: true, count: articles.length, data: articles });
}));

router.get('/:slug', wrap(async (req, res) => {
  const article = await db.getInsightBySlug(req.params.slug);
  if (!article || (article.is_published === false && !isAdminRequest(req))) {
    return res.status(404).json({ success: false, error: 'Article not found.' });
  }
  res.json({ success: true, data: article });
}));

router.post('/', requireAdmin, articleJson, validateBody(schemas.insight), wrap(async (req, res) => {
  const created = await db.createInsight(req.valid);
  res.status(201).json({ success: true, data: created });
}));

router.put('/:slug', requireAdmin, articleJson, validateBody(schemas.insight, { partial: true }), wrap(async (req, res) => {
  const updated = await db.updateInsight(req.params.slug, req.valid);
  if (!updated) return res.status(404).json({ success: false, error: 'Article not found.' });
  res.json({ success: true, data: updated });
}));

router.delete('/:slug', requireAdmin, wrap(async (req, res) => {
  const ok = await db.deleteInsight(req.params.slug);
  if (!ok) return res.status(404).json({ success: false, error: 'Article not found.' });
  res.json({ success: true, message: 'Article deleted successfully.' });
}));

module.exports = router;
