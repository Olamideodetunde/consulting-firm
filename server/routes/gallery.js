/**
 * THEWHY CONSULTING - Gallery API Routes
 * Public and admin endpoints for the activities gallery (photos grouped into albums,
 * e.g. "Rent-An-Accountant Launch", and moments within an album).
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db/db');
const auth = require('../lib/auth');
const { wrap } = require('../lib/util');

const publicRouter = express.Router();
const adminRouter = express.Router();

const GALLERY_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'img', 'gallery');

// Ensure gallery upload directory exists
try {
  if (!fs.existsSync(GALLERY_DIR)) {
    fs.mkdirSync(GALLERY_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[GALLERY] Could not create gallery directory:', e.message);
}

/**
 * Delete a file saved by the local-disk upload fallback (gallery_<timestamp>_<name>.<ext>).
 * Seeded photos and Cloudinary URLs are never touched.
 */
function removeLocalUpload(imageUrl) {
  const m = /^\/assets\/img\/gallery\/(gallery_\d+_[A-Za-z0-9_-]+\.(?:jpg|png|webp|avif))$/.exec(String(imageUrl || ''));
  if (!m) return;
  fs.unlink(path.join(GALLERY_DIR, m[1]), () => {});
}

// ---------------------------------------------------------------------------
// PUBLIC ROUTES
// ---------------------------------------------------------------------------

// GET /api/gallery - paginated list of active gallery items
publicRouter.get('/', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  let limit = 24;
  if (req.query.limit === 'all' || req.query.limit === '0') {
    limit = 0;
  } else if (req.query.limit) {
    limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10)));
  }

  const offset = limit > 0 ? (page - 1) * limit : 0;
  const album = String(req.query.album || '').trim();
  const category = String(req.query.category || '').trim();
  const search = String(req.query.search || '').trim();
  const featuredOnly = req.query.featured === 'true' || req.query.featured === '1';

  const result = await db.getAllGalleryItems({
    album,
    category,
    featuredOnly,
    activeOnly: true,
    limit,
    offset,
    search
  });

  const totalPages = limit > 0 ? Math.ceil(result.total / limit) : 1;

  res.json({
    success: true,
    count: result.items.length,
    total: result.total,
    page,
    totalPages,
    limit,
    albums: result.albums,
    categories: result.categories,
    data: result.items
  });
}));

// GET /api/gallery/categories - distinct active categories
publicRouter.get('/categories', wrap(async (req, res) => {
  const result = await db.getAllGalleryItems({ activeOnly: true, limit: 1 });
  res.json({
    success: true,
    data: result.categories
  });
}));

// GET /api/gallery/:id - single photo
publicRouter.get('/:id', wrap(async (req, res) => {
  const item = await db.getGalleryItemById(req.params.id);
  if (!item || (!item.is_active && !auth.isAdminRequest(req))) {
    return res.status(404).json({ success: false, error: 'Photo not found.' });
  }
  res.json({ success: true, data: item });
}));

// ---------------------------------------------------------------------------
// ADMIN ROUTES (Protected)
// ---------------------------------------------------------------------------
adminRouter.use(auth.requireAdmin);

// Parser for large upload bodies (supports base64 image data up to 25MB)
const largeJson = express.json({ limit: '25mb' });

// GET /api/admin/gallery - admin list (includes hidden photos)
adminRouter.get('/', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  let limit = 36;
  if (req.query.limit === 'all' || req.query.limit === '0') {
    limit = 0;
  } else if (req.query.limit) {
    limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10)));
  }

  const offset = limit > 0 ? (page - 1) * limit : 0;
  const album = String(req.query.album || '').trim();
  const category = String(req.query.category || '').trim();
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || 'all').toLowerCase();

  let activeOnly = false;
  let featuredOnly = false;
  if (status === 'active') activeOnly = true;
  if (status === 'featured') featuredOnly = true;

  const result = await db.getAllGalleryItems({
    album,
    category,
    featuredOnly,
    activeOnly,
    limit,
    offset,
    search
  });

  // Filter hidden in memory if status === 'hidden'
  let items = result.items;
  let total = result.total;
  if (status === 'hidden') {
    items = items.filter(i => !i.is_active);
    total = items.length;
  }

  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

  res.json({
    success: true,
    count: items.length,
    total,
    page,
    totalPages,
    limit,
    albums: result.albums,
    categories: result.categories,
    data: items
  });
}));

// POST /api/admin/gallery - add new photo item
adminRouter.post('/', wrap(async (req, res) => {
  const { title, image_url, album, category, caption, display_order, is_featured, is_active } = req.body;
  if (!image_url || typeof image_url !== 'string') {
    return res.status(400).json({ success: false, error: 'Image URL is required.' });
  }

  const item = await db.createGalleryItem({
    title: title || 'Gallery photo',
    image_url,
    album,
    category,
    caption: caption || '',
    display_order: display_order !== undefined ? parseInt(display_order, 10) : 0,
    is_featured: !!is_featured,
    is_active: is_active !== false
  });

  res.status(201).json({
    success: true,
    message: 'Photo added to gallery successfully.',
    data: item
  });
}));

// PUT /api/admin/gallery/:id - update existing photo
adminRouter.put('/:id', wrap(async (req, res) => {
  const existing = await db.getGalleryItemById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Photo not found.' });
  }

  const updated = await db.updateGalleryItem(req.params.id, req.body);
  res.json({
    success: true,
    message: 'Photo updated successfully.',
    data: updated
  });
}));

// DELETE /api/admin/gallery/:id - delete photo
adminRouter.delete('/:id', wrap(async (req, res) => {
  const existing = await db.getGalleryItemById(req.params.id);
  const ok = existing && await db.deleteGalleryItem(req.params.id);
  if (!ok) {
    return res.status(404).json({ success: false, error: 'Photo not found.' });
  }
  removeLocalUpload(existing.image_url);
  res.json({ success: true, message: 'Photo removed from gallery.' });
}));

// POST /api/admin/gallery/upload - upload image file directly (base64)
adminRouter.post('/upload', largeJson, wrap(async (req, res) => {
  const { filename, data, title, album, category, caption, is_featured, is_active, display_order } = req.body;

  if (!data || typeof data !== 'string') {
    return res.status(400).json({ success: false, error: 'No image data provided.' });
  }

  // Parse Data URI
  const match = data.match(/^data:image\/(jpeg|jpg|png|webp|avif);base64,(.+)$/i);
  if (!match) {
    return res.status(400).json({
      success: false,
      error: 'Invalid image format. Allowed formats: JPG, PNG, WebP, AVIF.'
    });
  }

  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Limit file size to 20MB
  if (buffer.length > 20 * 1024 * 1024) {
    return res.status(400).json({ success: false, error: 'Image size exceeds maximum limit of 20 MB.' });
  }

  // Sanitize filename
  const rawName = (filename || 'image').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = `gallery_${Date.now()}_${rawName.slice(0, 30)}.${ext}`;
  const filePath = path.join(GALLERY_DIR, safeFilename);

  fs.writeFileSync(filePath, buffer);
  const publicUrl = `/assets/img/gallery/${safeFilename}`;

  // Automatically create database record
  const item = await db.createGalleryItem({
    title: (title || filename || 'Gallery photo').replace(/\.[^/.]+$/, ''),
    image_url: publicUrl,
    album,
    category,
    caption: caption || '',
    display_order: display_order !== undefined ? parseInt(display_order, 10) : 0,
    is_featured: !!is_featured,
    is_active: is_active !== false
  });

  res.status(201).json({
    success: true,
    message: 'Photo uploaded and added to gallery.',
    url: publicUrl,
    data: item
  });
}));

module.exports = {
  publicRouter,
  adminRouter
};
