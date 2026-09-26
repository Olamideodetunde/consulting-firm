/**
 * Admin Content & Settings Management Route
 * Supports live site configuration, product launch updates, media listing, and passcode auth.
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db/db');

// POST /api/admin/verify - Verify admin passcode
router.post('/verify', (req, res) => {
  const { passcode } = req.body;
  if (db.verifyAdminPasscode(passcode)) {
    return res.json({ success: true, message: 'Authenticated successfully.' });
  }
  return res.status(401).json({ success: false, error: 'Invalid admin passcode.' });
});

// GET /api/admin/content - Retrieve all site content
router.get('/content', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        services: db.getServices(),
        industries: db.getIndustries(),
        team: db.getTeam(),
        testimonials: db.getTestimonials(),
        launchCampaign: db.getLaunchCampaign(),
        siteSettings: db.getSiteSettings()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/launch - Update product launch content
router.put('/launch', (req, res) => {
  try {
    const updated = db.updateLaunchCampaign(req.body);
    res.json({ success: true, data: updated, message: 'Launch campaign updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/settings - Update site settings & announcements
router.put('/settings', (req, res) => {
  try {
    const updated = db.updateSiteSettings(req.body);
    res.json({ success: true, data: updated, message: 'Site settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/media - Scan and list approved media assets
router.get('/media', (req, res) => {
  try {
    const imgDir = path.join(__dirname, '..', '..', 'public', 'assets', 'img');
    const bannersDir = path.join(imgDir, 'banners');
    const blogDir = path.join(imgDir, 'blog');
    const bgDir = path.join(imgDir, 'bg');

    const getFiles = (dir, prefix) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir)
        .filter(f => /\.(jpg|jpeg|png|svg|webp)$/i.test(f))
        .map(f => ({ name: f, path: `${prefix}/${f}` }));
    };

    const media = [
      ...getFiles(bannersDir, '/assets/img/banners'),
      ...getFiles(blogDir, '/assets/img/blog'),
      ...getFiles(bgDir, '/assets/img/bg'),
      ...getFiles(imgDir, '/assets/img')
    ];

    res.json({ success: true, count: media.length, data: media });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
