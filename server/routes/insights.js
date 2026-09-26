/**
 * Insights & Blog Articles Route
 * Exposes business articles, compliance updates, and full Admin CRUD.
 */
const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/insights - list all published articles
router.get('/', async (req, res) => {
  try {
    const articles = await db.getAllInsights();
    res.json({ success: true, count: articles.length, data: articles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/insights/:slug - get single article by slug
router.get('/:slug', async (req, res) => {
  try {
    const article = await db.getInsightBySlug(req.params.slug);
    if (!article) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }
    res.json({ success: true, data: article });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/insights - create new article
router.post('/', async (req, res) => {
  try {
    const { title, category, excerpt, content, cover_image, author, readTime, tags, is_published } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required.' });
    }
    const created = await db.createInsight({
      title,
      category,
      excerpt,
      content,
      cover_image,
      author,
      readTime,
      tags,
      is_published
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/insights/:slug - update existing article
router.put('/:slug', async (req, res) => {
  try {
    const updated = await db.updateInsight(req.params.slug, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/insights/:slug - delete article
router.delete('/:slug', async (req, res) => {
  try {
    const success = await db.deleteInsight(req.params.slug);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }
    res.json({ success: true, message: 'Article deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
