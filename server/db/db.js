/**
 * THEWHY CONSULTING - Data layer
 *
 * Two storage modes, chosen once at startup by initDb():
 *   - "mysql": every read and write for dynamic data goes to MySQL.
 *   - "json":  fallback when MySQL is unreachable (or DB_MODE=json). Data lives in a
 *              gitignored runtime file (DB_JSON_PATH, default server/data/runtime-db.json),
 *              seeded from seedData.js on first run and written atomically.
 * Never both: when MySQL is connected, the JSON store is not touched.
 *
 * Static marketing content (services, industries, team, testimonials, case studies,
 * FAQs) is read-only and served straight from seedData.js.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const seedData = require('./seedData');
const { makeRefCode, slugify } = require('../lib/util');

const JSON_PATH = process.env.DB_JSON_PATH
  ? path.resolve(process.env.DB_JSON_PATH)
  : path.join(__dirname, '..', 'data', 'runtime-db.json');

let mode = 'json';
let pool = null;
let initialized = false;
let store = null;

const clone = (obj) => JSON.parse(JSON.stringify(obj));
const nowIso = () => new Date().toISOString();

function getMode() {
  return mode;
}
function isMysql() {
  return mode === 'mysql' && !!pool;
}

// ---------------------------------------------------------------------------
// JSON STORE (fallback)
// ---------------------------------------------------------------------------
function seedInsightsForStore() {
  const ts = nowIso();
  return (seedData.insights || []).map(item => ({
    id: crypto.randomUUID(),
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt || '',
    content: item.content || '',
    category: item.category || 'Insights',
    cover_image: item.cover_image || '',
    author: item.author || 'THEWHY Practice Team',
    readTime: item.readTime || '4 min read',
    tags: item.tags || [],
    is_published: true,
    published_at: ts,
    created_at: ts,
    updated_at: ts
  }));
}

function freshStore() {
  return {
    version: 2,
    bookings: [],
    contacts: [],
    inquiries: [],
    insights: seedInsightsForStore(),
    newsletter: [],
    siteSettings: clone(seedData.siteSettings),
    launchCampaign: clone(seedData.launchCampaign)
  };
}

function loadStore() {
  if (store) return store;
  let loaded = null;
  try {
    if (fs.existsSync(JSON_PATH)) {
      loaded = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn(`[DB] Could not read JSON store at ${JSON_PATH}: ${e.message}. Starting from seed data.`);
  }
  const base = freshStore();
  if (!loaded || typeof loaded !== 'object') {
    store = base;
  } else {
    store = {
      version: 2,
      bookings: Array.isArray(loaded.bookings) ? loaded.bookings : [],
      contacts: Array.isArray(loaded.contacts) ? loaded.contacts : [],
      inquiries: Array.isArray(loaded.inquiries) ? loaded.inquiries : [],
      insights: Array.isArray(loaded.insights) ? loaded.insights : base.insights,
      newsletter: Array.isArray(loaded.newsletter) ? loaded.newsletter : [],
      siteSettings: { ...base.siteSettings, ...(loaded.siteSettings || {}) },
      launchCampaign: { ...base.launchCampaign, ...(loaded.launchCampaign || {}) }
    };
  }
  // Never keep a passcode in stored settings (legacy data had one).
  delete store.siteSettings.adminPasscode;
  saveStore();
  return store;
}

function saveStore() {
  if (!store) return;
  const dir = path.dirname(JSON_PATH);
  const tmp = `${JSON_PATH}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
    let lastErr = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.renameSync(tmp, JSON_PATH);
        return;
      } catch (e) {
        lastErr = e;
        // Windows can briefly lock the target (antivirus, indexers): retry.
        if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) break;
        const until = Date.now() + 25 * (attempt + 1);
        while (Date.now() < until) { /* short spin */ }
      }
    }
    throw lastErr;
  } catch (e) {
    console.error('[DB] Could not save JSON store:', e.message);
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// MYSQL
// ---------------------------------------------------------------------------
function createPool() {
  const common = {
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    queueLimit: 0,
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000', 10),
    charset: 'utf8mb4'
  };
  if (process.env.DATABASE_URL) {
    return mysql.createPool({ uri: process.env.DATABASE_URL, ...common });
  }
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'whyng_db',
    ...common
  });
}

async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function ensureColumn(table, column, ddl) {
  const rows = await q(
    'SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  if (!Number(rows[0].n)) await q(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
}

async function ensureUniqueIndex(table, indexName, column) {
  const rows = await q(
    'SELECT COUNT(*) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
    [table, indexName]
  );
  if (!Number(rows[0].n)) await q(`ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${indexName}\` (\`${column}\`)`);
}

async function ensureUid(table) {
  await ensureColumn(table, 'uid', 'uid CHAR(36) NULL');
  await q(`UPDATE \`${table}\` SET uid = UUID() WHERE uid IS NULL OR uid = ''`);
  await ensureUniqueIndex(table, `uq_${table}_uid`, 'uid');
}

async function createSchema() {
  await q(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid CHAR(36) NULL,
      ref_code VARCHAR(50) UNIQUE NOT NULL,
      client_name VARCHAR(200) NOT NULL,
      client_email VARCHAR(200) NOT NULL,
      client_phone VARCHAR(50) NOT NULL,
      company_name VARCHAR(200),
      service VARCHAR(200) NOT NULL,
      meeting_type VARCHAR(100) DEFAULT 'Virtual (Google Meet)',
      appointment_date DATE NULL,
      time_slot VARCHAR(60),
      company_size VARCHAR(100),
      message TEXT,
      estimated_fee VARCHAR(100),
      status VARCHAR(50) DEFAULT 'PENDING',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await q(`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid CHAR(36) NULL,
      ref_code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(200) NOT NULL,
      phone VARCHAR(50),
      subject VARCHAR(300) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'unread',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await q(`
    CREATE TABLE IF NOT EXISTS insights (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid CHAR(36) NULL,
      slug VARCHAR(200) UNIQUE NOT NULL,
      title VARCHAR(300) NOT NULL,
      excerpt TEXT,
      content LONGTEXT NOT NULL,
      category VARCHAR(100) DEFAULT 'Insights',
      cover_image VARCHAR(500),
      author VARCHAR(200) DEFAULT 'THEWHY Consulting',
      read_time VARCHAR(50),
      tags TEXT,
      is_published BOOLEAN DEFAULT true,
      published_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await q(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid CHAR(36) NULL,
      ref_code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(200) NOT NULL,
      phone VARCHAR(50),
      company VARCHAR(200),
      service_required VARCHAR(200),
      message TEXT,
      status VARCHAR(50) DEFAULT 'NEW',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await q(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uid CHAR(36) NULL,
      email VARCHAR(200) NOT NULL,
      name VARCHAR(200),
      source VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_newsletter_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await q(`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await q(`
    CREATE TABLE IF NOT EXISTS launch_campaign (
      id TINYINT PRIMARY KEY,
      data LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Upgrades for tables created by older versions.
  await ensureColumn('inquiries', 'company', 'company VARCHAR(200) NULL');
  await ensureColumn('insights', 'read_time', 'read_time VARCHAR(50) NULL');
  await ensureColumn('insights', 'tags', 'tags TEXT NULL');
  for (const t of ['bookings', 'contact_submissions', 'insights', 'inquiries', 'newsletter_subscribers']) {
    await ensureUid(t);
  }
}

async function seedMysql() {
  // Default articles: insert once, never overwrite admin edits.
  for (const post of seedData.insights || []) {
    await q(
      `INSERT IGNORE INTO insights (uid, slug, title, excerpt, content, category, cover_image, author, read_time, tags, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [crypto.randomUUID(), post.slug, post.title, post.excerpt || '', post.content || '', post.category || 'Insights',
        post.cover_image || '', post.author || 'THEWHY Practice Team', post.readTime || '4 min read', JSON.stringify(post.tags || [])]
    );
  }
  for (const [key, value] of Object.entries(seedData.siteSettings)) {
    await q('INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)', [key, String(value)]);
  }
  await q("DELETE FROM site_settings WHERE setting_key = 'adminPasscode'");
  await q('INSERT IGNORE INTO launch_campaign (id, data) VALUES (1, ?)', [JSON.stringify(seedData.launchCampaign)]);
}

async function initDb() {
  if (initialized) return mode;
  initialized = true;

  if ((process.env.DB_MODE || '').toLowerCase() === 'json') {
    mode = 'json';
    loadStore();
    console.log(`[DB] DB_MODE=json: using JSON store at ${JSON_PATH}`);
    warnIfProductionJson();
    return mode;
  }

  try {
    const dbName = process.env.DB_NAME || 'whyng_db';
    if (!process.env.DATABASE_URL && /^[A-Za-z0-9_$]+$/.test(dbName)) {
      try {
        const rootConn = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306', 10),
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
          connectTimeout: 4000
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await rootConn.end();
      } catch (e) {
        // The pool connection test below reports the real problem.
      }
    }

    pool = createPool();
    const conn = await pool.getConnection();
    conn.release();
    mode = 'mysql';
    await createSchema();
    await seedMysql();
    console.log('[DB] Connected to MySQL. Tables ready and verified.');
  } catch (err) {
    if (pool) {
      pool.end().catch(() => {});
      pool = null;
    }
    mode = 'json';
    console.log(`[DB] MySQL unavailable (${err.message}).`);
    console.log(`[DB] Using JSON fallback store at ${JSON_PATH}`);
    loadStore();
    warnIfProductionJson();
  }
  return mode;
}

function warnIfProductionJson() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('=======================================================');
    console.warn('[DB] WARNING: running in JSON fallback mode in production.');
    console.warn('[DB] Data is written to a local file; on hosts with ephemeral');
    console.warn('[DB] disks (Render, Railway, Heroku) it is LOST on redeploy.');
    console.warn('[DB] Configure DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME.');
    console.warn('=======================================================');
  }
}

async function closeDb() {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
  }
  mode = 'json';
  initialized = false;
}

// ---------------------------------------------------------------------------
// Row mappers (MySQL -> API shape)
// ---------------------------------------------------------------------------
function toIso(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
}
function toDateOnly(v) {
  if (!v) return '';
  if (v instanceof Date) {
    // DATE columns come back as local-midnight Date objects.
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
}
function parseTags(v) {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return String(v).split(',').map(t => t.trim()).filter(Boolean);
  }
}

const mapBooking = (r) => ({
  id: r.uid,
  ref_code: r.ref_code,
  clientName: r.client_name,
  email: r.client_email,
  phone: r.client_phone,
  companyName: r.company_name || '',
  service: r.service,
  meetingType: r.meeting_type,
  date: toDateOnly(r.appointment_date),
  timeSlot: r.time_slot,
  companySize: r.company_size,
  message: r.message || '',
  estimatedFee: r.estimated_fee,
  status: r.status,
  notes: r.notes || '',
  createdAt: toIso(r.created_at)
});

const mapContact = (r) => ({
  id: r.uid,
  ref_code: r.ref_code,
  name: r.name,
  email: r.email,
  phone: r.phone || '',
  subject: r.subject,
  message: r.message,
  status: r.status,
  createdAt: toIso(r.created_at)
});

const mapInquiry = (r) => ({
  id: r.uid,
  ref_code: r.ref_code,
  name: r.name,
  email: r.email,
  phone: r.phone || '',
  company: r.company || '',
  serviceRequired: r.service_required,
  message: r.message || '',
  status: r.status,
  createdAt: toIso(r.created_at)
});

const mapInsight = (r) => ({
  id: r.uid,
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt || '',
  content: r.content || '',
  category: r.category,
  cover_image: r.cover_image || '',
  author: r.author,
  readTime: r.read_time || '4 min read',
  tags: parseTags(r.tags),
  is_published: !!r.is_published,
  published_at: toIso(r.published_at),
  created_at: toIso(r.created_at),
  updated_at: toIso(r.updated_at)
});

const mapSubscriber = (r) => ({
  id: r.uid,
  email: r.email,
  name: r.name || '',
  source: r.source || '',
  createdAt: toIso(r.created_at)
});

function escapeLike(s) {
  return String(s).replace(/[\\%_]/g, (m) => `\\${m}`);
}

function matchesSearch(obj, fields, term) {
  if (!term) return true;
  const t = String(term).toLowerCase();
  return fields.some(f => String(obj[f] || '').toLowerCase().includes(t));
}

// ---------------------------------------------------------------------------
// BOOKINGS
// ---------------------------------------------------------------------------
const BOOKING_SEARCH_FIELDS = ['clientName', 'email', 'phone', 'companyName', 'service', 'ref_code'];

async function createBooking(data) {
  const booking = {
    id: crypto.randomUUID(),
    ref_code: makeRefCode('WHY'),
    clientName: data.clientName,
    email: data.email,
    phone: data.phone,
    companyName: data.companyName || '',
    service: data.service || 'General Strategic Advisory',
    meetingType: data.meetingType || 'Virtual (Google Meet)',
    date: data.date || new Date().toISOString().slice(0, 10),
    timeSlot: data.timeSlot || '10:00 AM - 10:45 AM',
    companySize: data.companySize || 'SME',
    message: data.message || '',
    estimatedFee: data.estimatedFee || 'To Be Determined',
    status: 'PENDING',
    notes: '',
    createdAt: nowIso()
  };

  if (isMysql()) {
    await q(
      `INSERT INTO bookings (uid, ref_code, client_name, client_email, client_phone, company_name, service, meeting_type,
        appointment_date, time_slot, company_size, message, estimated_fee, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [booking.id, booking.ref_code, booking.clientName, booking.email, booking.phone, booking.companyName, booking.service,
        booking.meetingType, booking.date, booking.timeSlot, booking.companySize, booking.message, booking.estimatedFee]
    );
    return booking;
  }

  const s = loadStore();
  s.bookings.unshift(booking);
  saveStore();
  return booking;
}

async function getAllBookings(filters = {}) {
  const status = filters.status && filters.status !== 'ALL' ? String(filters.status).toUpperCase() : null;
  const search = filters.search ? String(filters.search).trim().slice(0, 100) : '';

  if (isMysql()) {
    const where = [];
    const params = [];
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (search) {
      const like = `%${escapeLike(search)}%`;
      where.push('(client_name LIKE ? OR client_email LIKE ? OR client_phone LIKE ? OR company_name LIKE ? OR service LIKE ? OR ref_code LIKE ?)');
      params.push(like, like, like, like, like, like);
    }
    const sql = `SELECT * FROM bookings ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC`;
    return (await q(sql, params)).map(mapBooking);
  }

  return loadStore().bookings
    .filter(b => !status || b.status === status)
    .filter(b => matchesSearch(b, BOOKING_SEARCH_FIELDS, search));
}

async function getBookingById(id) {
  if (!id) return null;
  if (isMysql()) {
    const rows = await q('SELECT * FROM bookings WHERE uid = ? OR ref_code = ? LIMIT 1', [id, id]);
    return rows.length ? mapBooking(rows[0]) : null;
  }
  return loadStore().bookings.find(b => b.id === id || b.ref_code === id) || null;
}

async function updateBooking(id, updates) {
  if (isMysql()) {
    const sets = [];
    const params = [];
    if (updates.status !== undefined) {
      sets.push('status = ?');
      params.push(updates.status);
    }
    if (updates.notes !== undefined) {
      sets.push('notes = ?');
      params.push(updates.notes);
    }
    if (sets.length) {
      const res = await q(`UPDATE bookings SET ${sets.join(', ')} WHERE uid = ? OR ref_code = ?`, [...params, id, id]);
      if (!res.affectedRows) return null;
    }
    return getBookingById(id);
  }

  const s = loadStore();
  const b = s.bookings.find(item => item.id === id || item.ref_code === id);
  if (!b) return null;
  if (updates.status !== undefined) b.status = updates.status;
  if (updates.notes !== undefined) b.notes = updates.notes;
  saveStore();
  return b;
}

async function deleteBooking(id) {
  if (isMysql()) {
    const res = await q('DELETE FROM bookings WHERE uid = ? OR ref_code = ?', [id, id]);
    return res.affectedRows > 0;
  }
  const s = loadStore();
  const before = s.bookings.length;
  s.bookings = s.bookings.filter(b => b.id !== id && b.ref_code !== id);
  if (s.bookings.length === before) return false;
  saveStore();
  return true;
}

// ---------------------------------------------------------------------------
// CONTACT SUBMISSIONS
// ---------------------------------------------------------------------------
async function createContact(data) {
  const entry = {
    id: crypto.randomUUID(),
    ref_code: makeRefCode('CTX'),
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    subject: data.subject || 'General Inquiry',
    message: data.message,
    status: 'unread',
    createdAt: nowIso()
  };

  if (isMysql()) {
    await q(
      'INSERT INTO contact_submissions (uid, ref_code, name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [entry.id, entry.ref_code, entry.name, entry.email, entry.phone, entry.subject, entry.message]
    );
    return entry;
  }
  const s = loadStore();
  s.contacts.unshift(entry);
  saveStore();
  return entry;
}

async function getAllContacts() {
  if (isMysql()) {
    return (await q('SELECT * FROM contact_submissions ORDER BY created_at DESC, id DESC')).map(mapContact);
  }
  return loadStore().contacts;
}

async function updateContactStatus(id, status) {
  if (isMysql()) {
    const res = await q('UPDATE contact_submissions SET status = ? WHERE uid = ? OR ref_code = ?', [status, id, id]);
    if (!res.affectedRows) return null;
    const rows = await q('SELECT * FROM contact_submissions WHERE uid = ? OR ref_code = ? LIMIT 1', [id, id]);
    return rows.length ? mapContact(rows[0]) : null;
  }
  const s = loadStore();
  const c = s.contacts.find(item => item.id === id || item.ref_code === id);
  if (!c) return null;
  c.status = status;
  saveStore();
  return c;
}

async function deleteContact(id) {
  if (isMysql()) {
    const res = await q('DELETE FROM contact_submissions WHERE uid = ? OR ref_code = ?', [id, id]);
    return res.affectedRows > 0;
  }
  const s = loadStore();
  const before = s.contacts.length;
  s.contacts = s.contacts.filter(c => c.id !== id && c.ref_code !== id);
  if (s.contacts.length === before) return false;
  saveStore();
  return true;
}

// ---------------------------------------------------------------------------
// INQUIRIES (service inquiries, launch / bootcamp applications)
// ---------------------------------------------------------------------------
async function createInquiry(data) {
  const inq = {
    id: crypto.randomUUID(),
    ref_code: makeRefCode('INQ'),
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    company: data.company || '',
    serviceRequired: data.serviceRequired || 'General Consultation',
    message: data.message,
    status: 'NEW',
    createdAt: nowIso()
  };

  if (isMysql()) {
    await q(
      `INSERT INTO inquiries (uid, ref_code, name, email, phone, company, service_required, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEW')`,
      [inq.id, inq.ref_code, inq.name, inq.email, inq.phone, inq.company, inq.serviceRequired, inq.message]
    );
    return inq;
  }
  const s = loadStore();
  s.inquiries.unshift(inq);
  saveStore();
  return inq;
}

async function getAllInquiries() {
  if (isMysql()) {
    return (await q('SELECT * FROM inquiries ORDER BY created_at DESC, id DESC')).map(mapInquiry);
  }
  return loadStore().inquiries;
}

async function updateInquiryStatus(id, status) {
  if (isMysql()) {
    const res = await q('UPDATE inquiries SET status = ? WHERE uid = ? OR ref_code = ?', [status, id, id]);
    if (!res.affectedRows) return null;
    const rows = await q('SELECT * FROM inquiries WHERE uid = ? OR ref_code = ? LIMIT 1', [id, id]);
    return rows.length ? mapInquiry(rows[0]) : null;
  }
  const s = loadStore();
  const inq = s.inquiries.find(i => i.id === id || i.ref_code === id);
  if (!inq) return null;
  inq.status = status;
  saveStore();
  return inq;
}

async function deleteInquiry(id) {
  if (isMysql()) {
    const res = await q('DELETE FROM inquiries WHERE uid = ? OR ref_code = ?', [id, id]);
    return res.affectedRows > 0;
  }
  const s = loadStore();
  const before = s.inquiries.length;
  s.inquiries = s.inquiries.filter(i => i.id !== id && i.ref_code !== id);
  if (s.inquiries.length === before) return false;
  saveStore();
  return true;
}

// ---------------------------------------------------------------------------
// NEWSLETTER SUBSCRIBERS
// ---------------------------------------------------------------------------
async function addSubscriber({ email, name, source }) {
  const normalized = String(email).trim().toLowerCase();
  const sub = {
    id: crypto.randomUUID(),
    email: normalized,
    name: name || '',
    source: source || 'website',
    createdAt: nowIso()
  };
  if (isMysql()) {
    const res = await q(
      'INSERT IGNORE INTO newsletter_subscribers (uid, email, name, source) VALUES (?, ?, ?, ?)',
      [sub.id, sub.email, sub.name, sub.source]
    );
    return { created: res.affectedRows > 0, subscriber: sub };
  }
  const s = loadStore();
  const existing = s.newsletter.find(x => x.email === normalized);
  if (existing) return { created: false, subscriber: existing };
  s.newsletter.unshift(sub);
  saveStore();
  return { created: true, subscriber: sub };
}

async function getAllSubscribers() {
  if (isMysql()) {
    return (await q('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC, id DESC')).map(mapSubscriber);
  }
  return loadStore().newsletter;
}

async function deleteSubscriber(id) {
  if (isMysql()) {
    const res = await q('DELETE FROM newsletter_subscribers WHERE uid = ?', [id]);
    return res.affectedRows > 0;
  }
  const s = loadStore();
  const before = s.newsletter.length;
  s.newsletter = s.newsletter.filter(x => x.id !== id);
  if (s.newsletter.length === before) return false;
  saveStore();
  return true;
}

// ---------------------------------------------------------------------------
// INSIGHTS / BLOG
// ---------------------------------------------------------------------------
function sortInsights(list) {
  return [...list].sort((a, b) =>
    String(b.published_at || b.created_at || '').localeCompare(String(a.published_at || a.created_at || '')));
}

/** List insights. Published only unless { includeDrafts: true }. */
async function getAllInsights({ includeDrafts = false } = {}) {
  if (isMysql()) {
    const sql = `SELECT * FROM insights ${includeDrafts ? '' : 'WHERE is_published = 1'}
                 ORDER BY COALESCE(published_at, created_at) DESC, id DESC`;
    return (await q(sql)).map(mapInsight);
  }
  const list = loadStore().insights.filter(i => includeDrafts || i.is_published !== false);
  return sortInsights(list);
}

/** Get one insight by slug (drafts included; callers decide visibility). */
async function getInsightBySlug(slug) {
  if (!slug) return null;
  if (isMysql()) {
    const rows = await q('SELECT * FROM insights WHERE slug = ? LIMIT 1', [slug]);
    return rows.length ? mapInsight(rows[0]) : null;
  }
  return loadStore().insights.find(i => i.slug === slug) || null;
}

async function uniqueSlug(base) {
  let slug = base;
  for (let i = 0; i < 20; i++) {
    if (!(await getInsightBySlug(slug))) return slug;
    slug = `${base}-${crypto.randomBytes(2).toString('hex')}`;
  }
  return `${base}-${Date.now()}`;
}

async function createInsight(data) {
  const ts = nowIso();
  const article = {
    id: crypto.randomUUID(),
    slug: await uniqueSlug(slugify(data.title)),
    title: data.title,
    category: data.category || 'Business Strategy',
    excerpt: data.excerpt || '',
    content: data.content,
    cover_image: data.cover_image || 'assets/img/blog/1.jpg',
    author: data.author || 'THEWHY Practice Team',
    readTime: data.readTime || '4 min read',
    tags: data.tags && data.tags.length ? data.tags : ['Advisory'],
    is_published: data.is_published !== false,
    published_at: ts,
    created_at: ts,
    updated_at: ts
  };

  if (isMysql()) {
    await q(
      `INSERT INTO insights (uid, slug, title, excerpt, content, category, cover_image, author, read_time, tags, is_published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [article.id, article.slug, article.title, article.excerpt, article.content, article.category, article.cover_image,
        article.author, article.readTime, JSON.stringify(article.tags), article.is_published ? 1 : 0]
    );
    return getInsightBySlug(article.slug);
  }
  const s = loadStore();
  s.insights.unshift(article);
  saveStore();
  return article;
}

const INSIGHT_COLUMNS = {
  title: 'title',
  category: 'category',
  excerpt: 'excerpt',
  content: 'content',
  cover_image: 'cover_image',
  author: 'author',
  readTime: 'read_time',
  tags: 'tags',
  is_published: 'is_published'
};

async function updateInsight(slug, data) {
  if (isMysql()) {
    const sets = [];
    const params = [];
    for (const [key, col] of Object.entries(INSIGHT_COLUMNS)) {
      if (data[key] === undefined) continue;
      sets.push(`${col} = ?`);
      if (key === 'tags') params.push(JSON.stringify(data.tags));
      else if (key === 'is_published') params.push(data.is_published ? 1 : 0);
      else params.push(data[key]);
    }
    if (sets.length) {
      const res = await q(`UPDATE insights SET ${sets.join(', ')} WHERE slug = ?`, [...params, slug]);
      if (!res.affectedRows) return null;
    }
    return getInsightBySlug(slug);
  }
  const s = loadStore();
  const idx = s.insights.findIndex(i => i.slug === slug);
  if (idx === -1) return null;
  const patch = {};
  for (const key of Object.keys(INSIGHT_COLUMNS)) if (data[key] !== undefined) patch[key] = data[key];
  s.insights[idx] = { ...s.insights[idx], ...patch, updated_at: nowIso() };
  saveStore();
  return s.insights[idx];
}

async function deleteInsight(slug) {
  if (isMysql()) {
    const res = await q('DELETE FROM insights WHERE slug = ?', [slug]);
    return res.affectedRows > 0;
  }
  const s = loadStore();
  const idx = s.insights.findIndex(i => i.slug === slug);
  if (idx === -1) return false;
  s.insights.splice(idx, 1);
  saveStore();
  return true;
}

// ---------------------------------------------------------------------------
// SITE SETTINGS & LAUNCH CAMPAIGN
// ---------------------------------------------------------------------------
async function getSiteSettings() {
  if (isMysql()) {
    const rows = await q('SELECT setting_key, setting_value FROM site_settings');
    const out = { ...seedData.siteSettings };
    for (const r of rows) out[r.setting_key] = r.setting_value;
    delete out.adminPasscode;
    return out;
  }
  const out = { ...loadStore().siteSettings };
  delete out.adminPasscode;
  return out;
}

/** `values` must already be filtered to allowlisted keys by the caller. */
async function updateSiteSettings(values) {
  if (isMysql()) {
    for (const [key, value] of Object.entries(values)) {
      await q(
        'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
        [key, String(value)]
      );
    }
    return getSiteSettings();
  }
  const s = loadStore();
  s.siteSettings = { ...s.siteSettings, ...values };
  delete s.siteSettings.adminPasscode;
  saveStore();
  return getSiteSettings();
}

async function getLaunchCampaign() {
  if (isMysql()) {
    const rows = await q('SELECT data FROM launch_campaign WHERE id = 1');
    if (!rows.length) return clone(seedData.launchCampaign);
    try {
      return { ...seedData.launchCampaign, ...JSON.parse(rows[0].data) };
    } catch (e) {
      return clone(seedData.launchCampaign);
    }
  }
  return loadStore().launchCampaign;
}

/** `values` must already be filtered to allowlisted keys by the caller. */
async function updateLaunchCampaign(values) {
  const merged = { ...(await getLaunchCampaign()), ...values };
  if (isMysql()) {
    await q(
      'INSERT INTO launch_campaign (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
      [JSON.stringify(merged)]
    );
    return merged;
  }
  const s = loadStore();
  s.launchCampaign = merged;
  saveStore();
  return merged;
}

// ---------------------------------------------------------------------------
// STATIC CONTENT (read-only, from seedData.js)
// ---------------------------------------------------------------------------
const getServices = () => seedData.services || [];
const getIndustries = () => seedData.industries || [];
const getTeam = () => seedData.team || [];
const getTestimonials = () => seedData.testimonials || [];
const getCaseStudies = () => seedData.caseStudies || [];
const getFaqs = () => seedData.faqs || [];

// ---------------------------------------------------------------------------
// STATS
// ---------------------------------------------------------------------------
async function getStats() {
  const [bookings, contacts, inquiries, subscribers] = await Promise.all([
    getAllBookings(), getAllContacts(), getAllInquiries(), getAllSubscribers()
  ]);
  return {
    totalBookings: bookings.length,
    pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
    confirmedBookings: bookings.filter(b => b.status === 'CONFIRMED').length,
    completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,
    cancelledBookings: bookings.filter(b => b.status === 'CANCELLED').length,
    totalInquiries: inquiries.length + contacts.length,
    newInquiries: inquiries.filter(i => i.status === 'NEW').length,
    totalContacts: contacts.length,
    unreadContacts: contacts.filter(c => c.status === 'unread').length,
    totalSubscribers: subscribers.length,
    storage: mode
  };
}

module.exports = {
  JSON_PATH,
  initDb,
  closeDb,
  getMode,
  isMysql,
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  createContact,
  getAllContacts,
  updateContactStatus,
  deleteContact,
  createInquiry,
  getAllInquiries,
  updateInquiryStatus,
  deleteInquiry,
  addSubscriber,
  getAllSubscribers,
  deleteSubscriber,
  getAllInsights,
  getInsightBySlug,
  createInsight,
  updateInsight,
  deleteInsight,
  getSiteSettings,
  updateSiteSettings,
  getLaunchCampaign,
  updateLaunchCampaign,
  getServices,
  getIndustries,
  getTeam,
  getTestimonials,
  getCaseStudies,
  getFaqs,
  getStats
};
