require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Middlewares
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiters (Mirrored from Gloria-adah architecture)
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/bookings', formLimiter, require('./routes/bookings'));
app.use('/api/contact', formLimiter, require('./routes/contact'));
app.use('/api/inquiries', formLimiter, require('./routes/inquiries'));
app.use('/api/insights', apiLimiter, require('./routes/insights'));
app.use('/api/admin', require('./routes/adminContent'));
app.use('/api/stats', require('./routes/stats'));

// Content Data APIs
app.get('/api/services', (req, res) => {
  res.json({ success: true, count: db.getServices().length, data: db.getServices() });
});

app.get('/api/industries', (req, res) => {
  res.json({ success: true, count: db.getIndustries().length, data: db.getIndustries() });
});

app.get('/api/team', (req, res) => {
  res.json({ success: true, count: db.getTeam().length, data: db.getTeam() });
});

app.get('/api/testimonials', (req, res) => {
  res.json({ success: true, count: db.getTestimonials().length, data: db.getTestimonials() });
});

app.get('/api/launch', (req, res) => {
  res.json({ success: true, data: db.getLaunchCampaign() });
});

app.get('/api/settings', (req, res) => {
  res.json({ success: true, data: db.getSiteSettings() });
});

app.get('/api/case-studies', (req, res) => {
  res.json({ success: true, data: db.getCaseStudies() });
});

app.get('/api/faqs', (req, res) => {
  res.json({ success: true, data: db.getFaqs() });
});

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    firm: 'THEWHY CONSULTING',
    affiliate: 'Wale Kehinde & Co. (Chartered Accountants)',
    timestamp: new Date().toISOString()
  });
});

// Clean Page Routes
const sendPage = (page) => (req, res) => res.sendFile(path.join(__dirname, '..', 'public', page));
app.get('/', sendPage('index.html'));
app.get('/about', sendPage('about.html'));
app.get('/services', sendPage('services.html'));
app.get('/industries', sendPage('industries.html'));
app.get('/who-we-serve', sendPage('industries.html'));
app.get('/team', sendPage('team.html'));
app.get('/our-team', sendPage('team.html'));
app.get('/insights', sendPage('insights.html'));
app.get('/article', sendPage('article.html'));
app.get('/insights/:slug', sendPage('article.html'));
app.get('/launch', sendPage('launch.html'));
app.get('/product-launch', sendPage('launch.html'));
app.get('/contact', sendPage('contact.html'));
app.get('/privacy', sendPage('privacy.html'));
app.get('/terms', sendPage('terms.html'));
app.get('/admin', sendPage('admin.html'));

// 404 Handler - Serves custom branded 404 page
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[API] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    await db.initDb();
  } catch (err) {
    console.error('[DB] Startup notice:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`   THEWHY CONSULTING (why.ng) - FULLSTACK PLATFORM     `);
    console.log(`   Server running on: http://localhost:${PORT}          `);
    console.log(`   Admin Portal:      http://localhost:${PORT}/admin    `);
    console.log(`   Insights & Blog:   http://localhost:${PORT}/insights `);
    console.log(`=======================================================`);
  });
}

startServer();

module.exports = app;
