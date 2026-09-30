/**
 * SEO routes: dynamic sitemap, legacy URL redirects, and server-rendered meta
 * tags for /insights/:slug.
 *
 * Registered BEFORE express.static so that /sitemap.xml and /*.html redirects
 * are not shadowed by files in public/.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db/db');
const { escapeHtml, wrap } = require('../lib/util');
const { isAdminRequest } = require('../lib/auth');

const router = express.Router();
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

function siteUrl() {
  return (process.env.SITE_URL || 'https://why.ng').replace(/\/+$/, '');
}

// Clean, indexable routes. Keep in sync with public/sitemap.xml (static fallback).
const STATIC_ROUTES = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/about', priority: '0.8', changefreq: 'monthly' },
  { loc: '/services', priority: '0.9', changefreq: 'monthly' },
  { loc: '/industries', priority: '0.7', changefreq: 'monthly' },
  { loc: '/team', priority: '0.7', changefreq: 'monthly' },
  { loc: '/insights', priority: '0.8', changefreq: 'weekly' },
  { loc: '/launch', priority: '0.8', changefreq: 'weekly' },
  { loc: '/contact', priority: '0.7', changefreq: 'yearly' },
  { loc: '/booking', priority: '0.8', changefreq: 'yearly' },
  { loc: '/calculator', priority: '0.6', changefreq: 'monthly' },
  { loc: '/case-studies', priority: '0.7', changefreq: 'monthly' },
  { loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { loc: '/terms', priority: '0.3', changefreq: 'yearly' }
];

// Pages that have a clean route; /<page>.html 301-redirects to it.
const HTML_REDIRECTS = {
  'index.html': '/',
  'about.html': '/about',
  'services.html': '/services',
  'industries.html': '/industries',
  'team.html': '/team',
  'insights.html': '/insights',
  'launch.html': '/launch',
  'contact.html': '/contact',
  'booking.html': '/booking',
  'calculator.html': '/calculator',
  'case-studies.html': '/case-studies',
  'privacy.html': '/privacy',
  'terms.html': '/terms',
  'admin.html': '/admin'
};

const ALIAS_REDIRECTS = {
  '/our-team': '/team',
  '/who-we-serve': '/industries',
  '/product-launch': '/launch'
};

function queryString(req) {
  const idx = req.originalUrl.indexOf('?');
  return idx === -1 ? '' : req.originalUrl.slice(idx);
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function dateOnly(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function buildSitemap(insights) {
  const base = siteUrl();
  const urls = STATIC_ROUTES.map(r =>
    `  <url>\n    <loc>${xmlEscape(base + r.loc)}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`);
  for (const a of insights) {
    if (!a || !a.slug || a.is_published === false) continue;
    const lastmod = dateOnly(a.updated_at || a.published_at || a.created_at);
    urls.push(`  <url>\n    <loc>${xmlEscape(`${base}/insights/${encodeURIComponent(a.slug)}`)}</loc>\n`
      + (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '')
      + '    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>');
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

router.get('/sitemap.xml', async (req, res) => {
  let insights = [];
  try {
    insights = await db.getAllInsights();
  } catch (err) {
    console.warn('[SEO] Sitemap: could not load insights, serving static routes only:', err.message);
  }
  res.type('application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(buildSitemap(insights));
});

// /about.html -> /about etc. (query string preserved)
router.get(/^\/([a-z0-9-]+\.html)$/i, (req, res, next) => {
  const target = HTML_REDIRECTS[req.params[0].toLowerCase()];
  if (!target) return next();
  res.redirect(301, target + queryString(req));
});

// /article.html?slug=x and /article?slug=x -> /insights/x
router.get(['/article', '/article.html'], (req, res) => {
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  res.redirect(301, slug ? `/insights/${encodeURIComponent(slug)}` : '/insights');
});

for (const [from, to] of Object.entries(ALIAS_REDIRECTS)) {
  router.get(from, (req, res) => res.redirect(301, to + queryString(req)));
}

// ---------------------------------------------------------------------------
// /insights/:slug with per-article meta tags
// ---------------------------------------------------------------------------
// Characters that must not appear raw inside an inline <script>: < > & and U+2028/U+2029.
const JSONLD_UNSAFE = new RegExp('[<>&' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');

function jsonLdSafe(obj) {
  // Escape them as JSON unicode escapes so the JSON cannot close the <script> tag.
  return JSON.stringify(obj).replace(JSONLD_UNSAFE, c => '\\' + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

function absoluteUrl(p) {
  if (!p) return '';
  if (/^https:\/\//i.test(p)) return p;
  return `${siteUrl()}/${String(p).replace(/^\/+/, '')}`;
}

function renderArticleHtml(template, article) {
  const base = siteUrl();
  const url = `${base}/insights/${encodeURIComponent(article.slug)}`;
  const title = `${article.title} | THEWHY Consulting`;
  const description = String(article.excerpt || article.content || '')
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
  const image = absoluteUrl(article.cover_image);

  let html = template;
  // Remove tags we are about to (re)generate, to avoid duplicates.
  html = html.replace(/[ \t]*<link\b[^>]*\brel\s*=\s*["']?canonical["']?[^>]*>[ \t]*\r?\n?/gi, '');
  html = html.replace(/[ \t]*<meta\b[^>]*\bproperty\s*=\s*["']og:[^"']*["'][^>]*>[ \t]*\r?\n?/gi, '');
  html = html.replace(/[ \t]*<meta\b[^>]*\bname\s*=\s*["']twitter:[^"']*["'][^>]*>[ \t]*\r?\n?/gi, '');
  html = html.replace(/[ \t]*<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>[ \t]*\r?\n?/gi, '');

  const titleTag = `<title>${escapeHtml(title)}</title>`;
  if (/<title>[\s\S]*?<\/title>/i.test(html)) html = html.replace(/<title>[\s\S]*?<\/title>/i, () => titleTag);
  else html = html.replace(/<\/head>/i, () => `  ${titleTag}\n</head>`);

  const descTag = `<meta name="description" content="${escapeHtml(description)}" />`;
  if (/<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*>/i, () => descTag);
  } else {
    html = html.replace(/<\/head>/i, () => `  ${descTag}\n</head>`);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: String(article.title).slice(0, 110),
    description,
    author: { '@type': 'Person', name: article.author || 'THEWHY Practice Team' },
    publisher: {
      '@type': 'Organization',
      name: 'THEWHY Consulting',
      logo: { '@type': 'ImageObject', url: `${base}/assets/img/logo-mark.svg` }
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url
  };
  if (image) jsonLd.image = [image];
  if (article.published_at || article.created_at) jsonLd.datePublished = article.published_at || article.created_at;
  if (article.updated_at) jsonLd.dateModified = article.updated_at;
  if (article.category) jsonLd.articleSection = article.category;

  const tags = [
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="THEWHY Consulting" />`,
    `<meta property="og:title" content="${escapeHtml(article.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : '',
    article.published_at ? `<meta property="article:published_time" content="${escapeHtml(article.published_at)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(article.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : '',
    `<script type="application/ld+json">${jsonLdSafe(jsonLd)}</script>`
  ].filter(Boolean).map(t => `  ${t}`).join('\n');

  return html.replace(/<\/head>/i, () => `${tags}\n</head>`);
}

function sendNotFound(res) {
  res.status(404);
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(PUBLIC_DIR, '404.html'));
}

router.get('/insights/:slug', wrap(async (req, res) => {
  const article = await db.getInsightBySlug(req.params.slug);
  if (!article || (article.is_published === false && !isAdminRequest(req))) return sendNotFound(res);

  const template = await fs.promises.readFile(path.join(PUBLIC_DIR, 'article.html'), 'utf8');
  res.setHeader('Cache-Control', 'no-cache');
  if (article.is_published === false) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.type('html').send(renderArticleHtml(template, article));
}));

module.exports = router;
module.exports.buildSitemap = buildSitemap;
module.exports.renderArticleHtml = renderArticleHtml;
module.exports.STATIC_ROUTES = STATIC_ROUTES;
