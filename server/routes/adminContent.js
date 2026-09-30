/**
 * Admin console API.
 *   POST   /api/admin/verify      public (hard rate limit): { passcode } -> sets session cookie
 *   GET    /api/admin/session     public: { authenticated: bool }, 401 when not signed in
 *   POST   /api/admin/logout      public: clears the session cookie
 * Everything below requires an admin session:
 *   GET    /api/admin/content
 *   GET    /api/admin/settings            full (allowlisted) settings
 *   PUT    /api/admin/settings            allowlisted keys only
 *   PUT    /api/admin/launch              allowlisted keys only
 *   GET    /api/admin/media
 *   GET    /api/admin/insights            all articles incl. drafts
 *   GET    /api/admin/newsletter          subscribers
 *   DELETE /api/admin/newsletter/:id
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const db = require('../db/db');
const auth = require('../lib/auth');
const { validateBody, schemas, pick, PUBLIC_SETTINGS_KEYS } = require('../lib/validate');
const { wrap } = require('../lib/util');

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.ADMIN_LOGIN_MAX_ATTEMPTS || '10', 10),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' }
});

router.post('/verify', verifyLimiter, validateBody(schemas.adminLogin), (req, res) => {
  if (!auth.verifyPasscode(req.valid.passcode)) {
    return res.status(401).json({ success: false, error: 'Invalid admin passcode.' });
  }
  auth.setSessionCookie(res);
  res.json({ success: true, message: 'Authenticated successfully.' });
});

router.get('/session', (req, res) => {
  const payload = auth.verifySessionToken(auth.getTokenFromRequest(req));
  if (!payload) return res.status(401).json({ success: false, authenticated: false });
  res.json({ success: true, authenticated: true, expiresAt: new Date(payload.exp).toISOString() });
});

router.post('/logout', (req, res) => {
  auth.revokeToken(auth.getTokenFromRequest(req));
  auth.clearSessionCookie(res);
  res.json({ success: true, message: 'Signed out.' });
});

// ---- Everything below requires an admin session ----
router.use(auth.requireAdmin);

router.get('/content', wrap(async (req, res) => {
  res.json({
    success: true,
    data: {
      services: db.getServices(),
      industries: db.getIndustries(),
      team: db.getTeam(),
      testimonials: db.getTestimonials(),
      launchCampaign: await db.getLaunchCampaign(),
      siteSettings: pick(await db.getSiteSettings(), PUBLIC_SETTINGS_KEYS)
    }
  });
}));

router.get('/settings', wrap(async (req, res) => {
  res.json({ success: true, data: pick(await db.getSiteSettings(), PUBLIC_SETTINGS_KEYS) });
}));

router.put('/settings', validateBody(schemas.siteSettings, { partial: true }), wrap(async (req, res) => {
  const updated = await db.updateSiteSettings(req.valid);
  res.json({ success: true, data: pick(updated, PUBLIC_SETTINGS_KEYS), message: 'Site settings updated successfully.' });
}));

router.put('/launch', validateBody(schemas.launchCampaign, { partial: true }), wrap(async (req, res) => {
  const updated = await db.updateLaunchCampaign(req.valid);
  res.json({ success: true, data: updated, message: 'Launch campaign updated successfully.' });
}));

router.get('/media', (req, res, next) => {
  try {
    const imgDir = path.join(__dirname, '..', '..', 'public', 'assets', 'img');
    const getFiles = (dir, prefix) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir)
        .filter(f => /\.(jpg|jpeg|png|svg|webp)$/i.test(f))
        .map(f => ({ name: f, path: `${prefix}/${f}` }));
    };
    const media = [
      ...getFiles(path.join(imgDir, 'banners'), '/assets/img/banners'),
      ...getFiles(path.join(imgDir, 'blog'), '/assets/img/blog'),
      ...getFiles(path.join(imgDir, 'bg'), '/assets/img/bg'),
      ...getFiles(imgDir, '/assets/img')
    ];
    res.json({ success: true, count: media.length, data: media });
  } catch (err) {
    next(err);
  }
});

router.get('/insights', wrap(async (req, res) => {
  const articles = await db.getAllInsights({ includeDrafts: true });
  res.json({ success: true, count: articles.length, data: articles });
}));

router.get('/newsletter', wrap(async (req, res) => {
  const subs = await db.getAllSubscribers();
  res.json({ success: true, count: subs.length, data: subs });
}));

router.delete('/newsletter/:id', wrap(async (req, res) => {
  const ok = await db.deleteSubscriber(req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Subscriber not found.' });
  res.json({ success: true, message: 'Subscriber removed.' });
}));

module.exports = router;
