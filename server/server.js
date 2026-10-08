require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const auth = require('./lib/auth');
const db = require('./db/db');
const { pick, PUBLIC_SETTINGS_KEYS } = require('./lib/validate');
const { wrap } = require('./lib/util');

// Fails fast in production when ADMIN_PASSCODE / ADMIN_SESSION_SECRET are unsafe.
try {
  auth.initAuth();
} catch (err) {
  if (require.main === module) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.disable('x-powered-by');
app.set('trust proxy', parseInt(process.env.TRUST_PROXY || '1', 10));

// ---------------------------------------------------------------------------
// Security headers (CSP allowlist)
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      // Every page still has inline <script> blocks; keep 'unsafe-inline' for now.
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      // Admin image uploads go straight from the browser to Cloudinary.
      connectSrc: ["'self'", 'https://api.cloudinary.com'],
      frameSrc: ['https://www.openstreetmap.org', 'https://www.google.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: IS_PROD ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: IS_PROD ? undefined : false
}));

// ---------------------------------------------------------------------------
// CORS allowlist (same-origin requests without an Origin header are unaffected)
// ---------------------------------------------------------------------------
function corsOrigins() {
  const list = (process.env.CORS_ORIGINS || 'https://why.ng,https://www.why.ng')
    .split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
  if (!IS_PROD) {
    list.push(`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, 'http://localhost:3000', 'http://127.0.0.1:3000');
  }
  return new Set(list);
}
const ALLOWED_ORIGINS = corsOrigins();
app.use(cors({
  origin(origin, cb) {
    // Unknown origins get no CORS headers (the browser blocks the response); never throw.
    cb(null, !origin || ALLOWED_ORIGINS.has(origin));
  },
  credentials: true
}));

app.use(compression());

// Keep admin and API responses out of search engines.
app.use((req, res, next) => {
  if (req.path === '/admin' || req.path === '/admin.html' || req.path.startsWith('/api/')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});

// ---------------------------------------------------------------------------
// Body parsing (small limits). /api/insights parses its own larger JSON bodies
// after the admin check (see routes/insights.js).
// ---------------------------------------------------------------------------
const smallJson = express.json({ limit: '20kb' });
const smallForm = express.urlencoded({ extended: false, limit: '20kb' });
app.use((req, res, next) => {
  if (req.path.startsWith('/api/insights')) return next();
  smallJson(req, res, (err) => (err ? next(err) : smallForm(req, res, next)));
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.FORM_RATE_LIMIT || '30', 10),
  message: { success: false, error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.API_RATE_LIMIT || '600', 10),
  message: { success: false, error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);
app.post(['/api/bookings', '/api/contact', '/api/inquiries', '/api/newsletter', '/api/stats/newsletter'], formLimiter);

// ---------------------------------------------------------------------------
// SEO: sitemap, redirects, /insights/:slug meta tags (before static files)
// ---------------------------------------------------------------------------
app.use(require('./routes/seo'));

// ---------------------------------------------------------------------------
// Clean page routes
// ---------------------------------------------------------------------------
const sendPage = (page) => (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(PUBLIC_DIR, page));
};
app.get('/', sendPage('index.html'));
app.get('/about', sendPage('about.html'));
app.get('/services', sendPage('services.html'));
app.get('/industries', sendPage('industries.html'));
app.get('/team', sendPage('team.html'));
app.get('/insights', sendPage('insights.html'));
app.get('/launch', sendPage('launch.html'));
app.get('/contact', sendPage('contact.html'));
app.get('/booking', sendPage('booking.html'));
app.get('/calculator', sendPage('calculator.html'));
app.get('/case-studies', sendPage('case-studies.html'));
app.get('/privacy', sendPage('privacy.html'));
app.get('/terms', sendPage('terms.html'));
app.get('/admin', sendPage('admin.html'));

// ---------------------------------------------------------------------------
// Static files: 7-day cache for assets/css/js (not immutable: names are not
// hashed), no-cache for HTML.
// ---------------------------------------------------------------------------
app.use(express.static(PUBLIC_DIR, {
  index: false,
  cacheControl: false,
  setHeaders(res, filePath) {
    const rel = path.relative(PUBLIC_DIR, filePath).split(path.sep).join('/');
    if (rel.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/^(css|js)\//.test(rel)) {
      // Filenames are not content-hashed, so revalidate on every load (cheap
      // 304 via ETag) and visitors never run stale CSS/JS after a deploy.
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/^assets\//.test(rel)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/admin', require('./routes/adminContent'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/stats/newsletter', require('./routes/newsletter')); // legacy alias
app.use('/api/stats', require('./routes/stats'));

// Public content APIs
app.get('/api/services', (req, res) => {
  const data = db.getServices();
  res.json({ success: true, count: data.length, data });
});
app.get('/api/industries', (req, res) => {
  const data = db.getIndustries();
  res.json({ success: true, count: data.length, data });
});
app.get('/api/team', (req, res) => {
  const data = db.getTeam();
  res.json({ success: true, count: data.length, data });
});
app.get('/api/testimonials', (req, res) => {
  const data = db.getTestimonials();
  res.json({ success: true, count: data.length, data });
});
app.get('/api/case-studies', (req, res) => res.json({ success: true, data: db.getCaseStudies() }));
app.get('/api/faqs', (req, res) => res.json({ success: true, data: db.getFaqs() }));
app.get('/api/launch', wrap(async (req, res) => {
  res.json({ success: true, data: await db.getLaunchCampaign() });
}));
// Only explicitly allowlisted, public-safe settings are ever returned here.
app.get('/api/settings', wrap(async (req, res) => {
  res.json({ success: true, data: pick(await db.getSiteSettings(), PUBLIC_SETTINGS_KEYS) });
}));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    firm: 'THEWHY CONSULTING',
    storage: db.getMode(),
    timestamp: new Date().toISOString()
  });
});

// ---------------------------------------------------------------------------
// 404 and error handling
// ---------------------------------------------------------------------------
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});
app.use((req, res) => {
  res.status(404);
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(PUBLIC_DIR, '404.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request body is too large.' });
  }
  if (err && (err.type === 'entity.parse.failed' || err.status === 400)) {
    return res.status(400).json({ success: false, error: 'Malformed request body.' });
  }
  console.error('[API] Unhandled error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return;
  res.status(500).json({ success: false, error: 'Internal server error' });
});

async function startServer() {
  await db.initDb();
  return app.listen(PORT, () => {
    console.log('=======================================================');
    console.log('   THEWHY CONSULTING (why.ng) - FULLSTACK PLATFORM');
    console.log(`   Server running on: http://localhost:${PORT}`);
    console.log(`   Admin Portal:      http://localhost:${PORT}/admin`);
    console.log(`   Storage mode:      ${db.getMode()}`);
    console.log('=======================================================');
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('[SERVER] Failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = app;
module.exports.startServer = startServer;
