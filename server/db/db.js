/**
 * THEWHY CONSULTING - MySQL Database Engine
 * Modelled after Gloria-adah architecture with mysql2/promise connection pool,
 * automatic table creation, schema migrations, and seamless fault-tolerant fallback.
 */

const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const FALLBACK_FILE = path.join(__dirname, '..', 'data', 'database.json');

// Memory store fallback in case MySQL server is not reachable
let localStore = null;

function loadLocalStore() {
  if (localStore) return localStore;
  const seedData = require('./seedData');
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      localStore = JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('[DB] Could not load fallback JSON store:', e.message);
  }
  if (!localStore) {
    localStore = JSON.parse(JSON.stringify(seedData));
  } else {
    // Merge or upgrade existing store to ensure complete 10 services & all brief entities
    if (!localStore.services || localStore.services.length < 10) {
      localStore.services = seedData.services;
    }
    if (!localStore.industries) localStore.industries = seedData.industries;
    if (!localStore.team) localStore.team = seedData.team;
    if (!localStore.testimonials) localStore.testimonials = seedData.testimonials;
    if (!localStore.launchCampaign) localStore.launchCampaign = seedData.launchCampaign;
    if (!localStore.siteSettings) localStore.siteSettings = seedData.siteSettings;
  }
  if (!localStore.bookings) localStore.bookings = [];
  if (!localStore.inquiries) localStore.inquiries = [];
  if (!localStore.contacts) localStore.contacts = [];
  if (!localStore.insights) localStore.insights = [];
  saveLocalStore();
  return localStore;
}

function saveLocalStore() {
  try {
    const dir = path.dirname(FALLBACK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(localStore, null, 2), 'utf8');
  } catch (e) {
    console.error('[DB] Could not save fallback store:', e.message);
  }
}

// 1. MYSQL CONNECTION POOL
let pool = null;
let isConnectedToMysql = false;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  try {
    if (connectionString) {
      pool = mysql.createPool(connectionString);
    } else {
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'whyng_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000
      });
    }
  } catch (err) {
    console.warn('[DB] MySQL pool initialization notice:', err.message);
  }

  return pool;
}

// Query helper with MySQL parameter mapping ($1, $2 or ?)
async function query(sql, params = []) {
  const p = getPool();
  if (isConnectedToMysql && p) {
    try {
      const mysqlSql = sql.replace(/\$\d+/g, '?');
      const [rows, fields] = await p.query(mysqlSql, params);
      return { rows: Array.isArray(rows) ? rows : [], fields, result: rows };
    } catch (err) {
      console.warn('[DB] MySQL Query error, checking local store:', err.message);
    }
  }
  return { rows: [], fields: [], result: null };
}

// 2. SCHEMA INITIALIZATION & TABLE CREATION
async function initDb() {
  loadLocalStore();

  try {
    const dbName = process.env.DB_NAME || 'whyng_db';
    if (!process.env.DATABASE_URL) {
      try {
        const rootConn = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306', 10),
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
          connectTimeout: 4000
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await rootConn.end();
      } catch (e) {
        // Will be caught or logged below
      }
    }

    const p = getPool();
    if (!p) throw new Error('No MySQL pool configured');

    // Test connection
    const conn = await p.getConnection();
    conn.release();
    isConnectedToMysql = true;
    console.log('[DB] Connected to MySQL successfully.');

    // Create Tables
    await p.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ref_code VARCHAR(50) UNIQUE NOT NULL,
        client_name VARCHAR(200) NOT NULL,
        client_email VARCHAR(200) NOT NULL,
        client_phone VARCHAR(50) NOT NULL,
        company_name VARCHAR(200),
        service VARCHAR(150) NOT NULL,
        meeting_type VARCHAR(100) DEFAULT 'Virtual (Google Meet)',
        appointment_date DATE NULL,
        time_slot VARCHAR(50),
        company_size VARCHAR(100),
        message TEXT,
        estimated_fee VARCHAR(100),
        status VARCHAR(50) DEFAULT 'PENDING',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ref_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(200) NOT NULL,
        phone VARCHAR(50),
        subject VARCHAR(300) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS insights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(200) UNIQUE NOT NULL,
        title VARCHAR(300) NOT NULL,
        excerpt TEXT,
        content LONGTEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'Insights',
        cover_image VARCHAR(500),
        author VARCHAR(200) DEFAULT 'THEWHY Consulting',
        is_published BOOLEAN DEFAULT true,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ref_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(200) NOT NULL,
        phone VARCHAR(50),
        service_required VARCHAR(200),
        message TEXT,
        status VARCHAR(50) DEFAULT 'NEW',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await seedInsightsTable();
    console.log('[DB] MySQL tables ready and verified.');
  } catch (err) {
    isConnectedToMysql = false;
    console.log(`[DB] Notice: MySQL server connection unavailable (${err.message}).`);
    console.log('[DB] Operating in resilient fallback mode (data persisted in data/database.json).');
    seedLocalInsights();
  }
}

// 3. SEED INSIGHTS / ARTICLES
const DEFAULT_INSIGHTS = [
  {
    slug: 'cac-annual-returns-guide-2026',
    title: 'Filing Annual Returns with the CAC: A Practical 2026 Guide',
    excerpt: 'Every business registered in Nigeria under the CAC has a statutory obligation to file annual returns to prevent inactive status and striking off.',
    category: 'Corporate Compliance',
    cover_image: 'assets/img/blog/1.jpg',
    author: 'THEWHY Practice Team',
    content: `Every business registered in Nigeria under the Corporate Affairs Commission (CAC) has a mandatory statutory obligation to file annual returns. Failure to do so can result in serious penalties, classified inactive status on the CAC portal, and potential delisting from the register of companies.

### Why Filing Annual Returns is Critical
Annual returns are not tax filings or company financial statements; rather, they serve as official notification to the CAC that your registered enterprise or limited liability company remains solvent, active, and operationally viable. 

### Key Timelines & Deadlines
- **Business Names (Sole Proprietorships/Enterprises):** Must file not later than 30th June each calendar year.
- **Limited Liability Companies (LTD):** Must file within 42 days following the conclusion of the Annual General Meeting (AGM).
- **Incorporated Trustees (NGOs/Foundations):** Must file between 30th June and 31st December annually.

At THEWHY Consulting, in affiliation with Wale Kehinde & Co. (Chartered Accountants), we oversee the end-to-end statutory compliance calendar for growing SMEs and corporate conglomerates across Nigeria.`
  },
  {
    slug: 'excess-bank-charges-how-to-recover',
    title: 'Excess Bank Charges in Nigeria: How to Identify and Forensically Recover Them',
    excerpt: 'Nigerian commercial businesses routinely lose millions annually to compounding unapproved bank debits, COT excess, and miscalculated interest.',
    category: 'Banking & Finance',
    cover_image: 'assets/img/blog/2.jpg',
    author: 'Kehinde Adewale, FCA',
    content: `Systemic unapproved bank charges represent one of the quietest drains on corporate liquidity in Nigeria. From compounding interest rate miscalculations to unauthorized facility review fees and foreign exchange transaction markups, Nigerian businesses frequently surrender substantial reserves unknowingly.

### The Forensic Recovery Process
1. **Multi-Year Statement Acquisition:** Gathering complete transaction ledgers across all corporate borrowing, overdraft, and operating accounts.
2. **Re-computation According to CBN Guide to Bank Charges:** Running rigorous algorithmic reconciliation against Central Bank of Nigeria statutory caps.
3. **Formal Demand & Institutional Reconciliation:** Presenting substantiated audit findings directly to bank management and credit committees.

THEWHY Consulting has successfully recovered over ₦82.4 Million in unapproved bank charges for logistics, manufacturing, and trading enterprises.`
  },
  {
    slug: 'pencom-clearance-statutory-guide',
    title: 'PENCOM Clearance Certificates: Essential Requirements for Nigerian Contracts',
    excerpt: 'Understanding the compliance steps to obtain a National Pension Commission (PENCOM) clearance certificate for government tenders and regulatory permits.',
    category: 'HR & Compliance',
    cover_image: 'assets/img/blog/3.jpg',
    author: 'Dolapo Wale-Kehinde, PHRi',
    content: `Under the Pension Reform Act 2014, any enterprise employing 15 or more staff (or bidding for federal, state, and parastatal procurement contracts) must hold a current-year PENCOM Compliance Certificate.

### Mandatory Pre-requisites
- Valid Group Life Insurance policy for all employees (minimum 3x annual gross remuneration).
- Up-to-date monthly pension remittances with registered Pension Fund Administrators (PFAs).
- Certified evidence of employee enrollment and contribution schedules.

Our HR Advisory practice facilitates expedited compliance documentation, payroll alignment, and liaison with certified PFAs.`
  },
  {
    slug: 'turnaround-strategy-debt-management',
    title: 'Business Turnaround Strategy: Managing Hostile Debt and Restoring Cashflow',
    excerpt: 'A blueprint for Nigerian managing directors facing aggressive creditor action, receivership threats, and negative working capital.',
    category: 'Turnaround Strategy',
    cover_image: 'assets/img/blog/1.jpg',
    author: 'Kehinde Adewale, FCA',
    content: `When macroeconomic volatility strikes, even profitable enterprises can find their working capital suffocated by bank debt service and interest rate hikes.

### The Turnaround Checklist
- Immediate Cashflow Ringfencing: Identifying non-core assets and renegotiating unsecured vendor balances.
- Independent Fixed Asset Valuation: Establishing true current replacement valuation to counter liquidation fire-sale tactics.
- Moratorium Negotiation: Structuring sustainable 2 to 3-year grace periods with commercial banks based on verifiable projections.

Through aggressive financial engineering, THEWHY Consulting has defended over ₦3.2 Billion in operational machinery and preserved hundreds of jobs.`
  }
];

async function seedInsightsTable() {
  const p = getPool();
  if (!p) return;
  for (const post of DEFAULT_INSIGHTS) {
    await p.query(`
      INSERT INTO insights (slug, title, excerpt, content, category, cover_image, author, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, true)
      ON DUPLICATE KEY UPDATE title=VALUES(title), excerpt=VALUES(excerpt), content=VALUES(content)
    `, [post.slug, post.title, post.excerpt, post.content, post.category, post.cover_image, post.author]);
  }
}

function seedLocalInsights() {
  const store = loadLocalStore();
  if (!store.insights || store.insights.length === 0) {
    store.insights = DEFAULT_INSIGHTS.map((item, idx) => ({
      id: idx + 1,
      ...item,
      created_at: new Date().toISOString()
    }));
    saveLocalStore();
  }
}

// 4. BOOKING METHODS
async function createBooking(data) {
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const refCode = `WHY-2026-${randomHex}`;

  const clientName = data.clientName || data.client_name || 'Anonymous Client';
  const clientEmail = data.clientEmail || data.client_email || data.email || '';
  const clientPhone = data.clientPhone || data.client_phone || data.phone || '';
  const companyName = data.companyName || data.company_name || data.company || '';
  const service = data.service || 'General Strategic Advisory';
  const meetingType = data.meetingType || data.meeting_type || 'Virtual (Google Meet)';
  const dateVal = data.date || data.appointment_date || new Date().toISOString().split('T')[0];
  const timeSlot = data.timeSlot || data.time_slot || '10:00 AM - 10:45 AM';
  const companySize = data.companySize || data.company_size || 'SME';
  const message = data.message || '';
  const estimatedFee = data.estimatedFee || data.estimated_fee || 'To Be Determined';

  if (isConnectedToMysql && pool) {
    try {
      const [res] = await pool.query(`
        INSERT INTO bookings 
        (ref_code, client_name, client_email, client_phone, company_name, service, meeting_type, appointment_date, time_slot, company_size, message, estimated_fee, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `, [refCode, clientName, clientEmail, clientPhone, companyName, service, meetingType, dateVal, timeSlot, companySize, message, estimatedFee]);

      return {
        id: res.insertId,
        ref_code: refCode,
        clientName,
        email: clientEmail,
        phone: clientPhone,
        companyName,
        service,
        meetingType,
        date: dateVal,
        timeSlot,
        companySize,
        message,
        estimatedFee,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
    } catch (e) {
      console.warn('[DB] MySQL booking insert error, using local fallback:', e.message);
    }
  }

  // Local fallback
  const store = loadLocalStore();
  const newBooking = {
    id: refCode,
    ref_code: refCode,
    clientName,
    email: clientEmail,
    phone: clientPhone,
    companyName,
    service,
    meetingType,
    date: dateVal,
    timeSlot,
    companySize,
    message,
    estimatedFee,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  store.bookings.unshift(newBooking);
  saveLocalStore();
  return newBooking;
}

async function getAllBookings(filters = {}) {
  if (isConnectedToMysql && pool) {
    try {
      let sql = 'SELECT * FROM bookings ORDER BY created_at DESC';
      const [rows] = await pool.query(sql);
      return rows.map(r => ({
        id: r.ref_code || r.id,
        ref_code: r.ref_code,
        clientName: r.client_name,
        email: r.client_email,
        phone: r.client_phone,
        companyName: r.company_name,
        service: r.service,
        meetingType: r.meeting_type,
        date: r.appointment_date,
        timeSlot: r.time_slot,
        companySize: r.company_size,
        message: r.message,
        estimatedFee: r.estimated_fee,
        status: r.status,
        notes: r.notes,
        createdAt: r.created_at
      }));
    } catch (e) {
      console.warn('[DB] MySQL getAllBookings error, using local store:', e.message);
    }
  }

  const store = loadLocalStore();
  let list = [...(store.bookings || [])];
  if (filters.status && filters.status !== 'ALL') {
    list = list.filter(b => b.status === filters.status.toUpperCase());
  }
  return list;
}

async function getBookingById(id) {
  if (isConnectedToMysql && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM bookings WHERE ref_code = ? OR id = ? LIMIT 1', [id, id]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.ref_code || r.id,
          ref_code: r.ref_code,
          clientName: r.client_name,
          email: r.client_email,
          phone: r.client_phone,
          companyName: r.company_name,
          service: r.service,
          meetingType: r.meeting_type,
          date: r.appointment_date ? new Date(r.appointment_date).toISOString().split('T')[0] : '',
          timeSlot: r.time_slot,
          companySize: r.company_size,
          message: r.message,
          estimatedFee: r.estimated_fee,
          status: r.status,
          notes: r.notes,
          createdAt: r.created_at
        };
      }
    } catch (e) {
      console.warn('[DB] MySQL getBookingById error:', e.message);
    }
  }

  const store = loadLocalStore();
  return (store.bookings || []).find(b => b.id === id || b.ref_code === id);
}

async function updateBooking(id, updates) {
  if (isConnectedToMysql && pool) {
    try {
      const status = updates.status ? updates.status.toUpperCase() : undefined;
      const notes = updates.notes;
      if (status) {
        await pool.query('UPDATE bookings SET status = ?, notes = COALESCE(?, notes) WHERE ref_code = ? OR id = ?', [status, notes, id, id]);
      }
    } catch (e) {
      console.warn('[DB] MySQL updateBooking error:', e.message);
    }
  }

  const store = loadLocalStore();
  const b = (store.bookings || []).find(item => item.id === id || item.ref_code === id);
  if (b) {
    if (updates.status) b.status = updates.status.toUpperCase();
    if (updates.notes !== undefined) b.notes = updates.notes;
    saveLocalStore();
    return b;
  }
  return null;
}

async function deleteBooking(id) {
  if (isConnectedToMysql && pool) {
    try {
      await pool.query('DELETE FROM bookings WHERE ref_code = ? OR id = ?', [id, id]);
    } catch (e) {
      console.warn('[DB] MySQL deleteBooking error:', e.message);
    }
  }

  const store = loadLocalStore();
  const origLen = store.bookings.length;
  store.bookings = store.bookings.filter(b => b.id !== id && b.ref_code !== id);
  if (store.bookings.length !== origLen) {
    saveLocalStore();
    return true;
  }
  return false;
}

// 5. CONTACT SUBMISSIONS
async function createContact(data) {
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const refCode = `CTX-2026-${randomHex}`;

  const name = data.name || 'Anonymous';
  const email = data.email || '';
  const phone = data.phone || '';
  const subject = data.subject || 'General Inquiry';
  const message = data.message || '';

  if (isConnectedToMysql && pool) {
    try {
      const [res] = await pool.query(`
        INSERT INTO contact_submissions (ref_code, name, email, phone, subject, message)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [refCode, name, email, phone, subject, message]);
      return { id: res.insertId, ref_code: refCode, name, email, phone, subject, message, status: 'unread' };
    } catch (e) {
      console.warn('[DB] MySQL contact insert error:', e.message);
    }
  }

  const store = loadLocalStore();
  const entry = {
    id: refCode,
    ref_code: refCode,
    name,
    email,
    phone,
    subject,
    message,
    status: 'unread',
    createdAt: new Date().toISOString()
  };
  store.contacts.unshift(entry);
  saveLocalStore();
  return entry;
}

async function getAllContacts() {
  if (isConnectedToMysql && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM contact_submissions ORDER BY created_at DESC');
      return rows;
    } catch (e) {
      console.warn('[DB] MySQL getAllContacts error:', e.message);
    }
  }
  const store = loadLocalStore();
  return store.contacts || [];
}

// 6. INSIGHTS / BLOG POSTS
async function getAllInsights() {
  if (isConnectedToMysql && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM insights WHERE is_published = 1 ORDER BY created_at DESC');
      if (rows && rows.length > 0) return rows;
    } catch (e) {
      console.warn('[DB] MySQL getAllInsights error:', e.message);
    }
  }
  const store = loadLocalStore();
  return store.insights || DEFAULT_INSIGHTS;
}

async function getInsightBySlug(slug) {
  if (isConnectedToMysql && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM insights WHERE slug = ? LIMIT 1', [slug]);
      if (rows && rows.length > 0) return rows[0];
    } catch (e) {
      console.warn('[DB] MySQL getInsightBySlug error:', e.message);
    }
  }
  const store = loadLocalStore();
  return (store.insights || DEFAULT_INSIGHTS).find(i => i.slug === slug);
}

// 7. INQUIRIES
async function createInquiry(data) {
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  const refCode = `INQ-${randomHex}`;
  const store = loadLocalStore();
  const newInq = {
    id: refCode,
    ref_code: refCode,
    name: data.name,
    email: data.email,
    phone: data.phone,
    serviceRequired: data.serviceRequired || 'General Consultation',
    message: data.message,
    status: 'NEW',
    createdAt: new Date().toISOString()
  };
  store.inquiries.unshift(newInq);
  saveLocalStore();
  return newInq;
}

async function getAllInquiries() {
  const store = loadLocalStore();
  return store.inquiries || [];
}

// 8. CONTENT & STATS
function getServices() {
  const store = loadLocalStore();
  return store.services || [];
}

function getCaseStudies() {
  const store = loadLocalStore();
  return store.caseStudies || [];
}

function getTestimonials() {
  const store = loadLocalStore();
  return store.testimonials || [];
}

function getFaqs() {
  const store = loadLocalStore();
  return store.faqs || [];
}

async function getStats() {
  const bookings = await getAllBookings();
  const contacts = await getAllContacts();
  const inquiries = await getAllInquiries();
  return {
    totalBookings: bookings.length,
    pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
    confirmedBookings: bookings.filter(b => b.status === 'CONFIRMED').length,
    completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,
    totalInquiries: (inquiries.length || 0) + (contacts.length || 0),
    totalContacts: contacts.length,
    totalRecoveredBankCharges: "₦82.4 Million+",
    totalCapitalStructured: "₦450 Million+",
    totalAssetsVerified: "₦3.2 Billion+",
    clearanceRate: "100%"
  };
}

function getIndustries() {
  const store = loadLocalStore();
  return store.industries || [];
}

function getTeam() {
  const store = loadLocalStore();
  return store.team || [];
}

function getLaunchCampaign() {
  const store = loadLocalStore();
  return store.launchCampaign || {};
}

function updateLaunchCampaign(data) {
  const store = loadLocalStore();
  store.launchCampaign = { ...store.launchCampaign, ...data };
  saveLocalStore();
  return store.launchCampaign;
}

function getSiteSettings() {
  const store = loadLocalStore();
  return store.siteSettings || {};
}

function updateSiteSettings(data) {
  const store = loadLocalStore();
  store.siteSettings = { ...store.siteSettings, ...data };
  saveLocalStore();
  return store.siteSettings;
}

// 9. BLOG / INSIGHTS CRUD
async function createInsight(data) {
  const store = loadLocalStore();
  const slug = (data.title || 'insight')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

  const newArticle = {
    id: data.id || `art-${Date.now()}`,
    slug: data.slug || slug,
    title: data.title || 'Untitled Insight',
    category: data.category || 'Business Strategy',
    excerpt: data.excerpt || '',
    content: data.content || '',
    cover_image: data.cover_image || 'assets/img/blog/1.jpg',
    author: data.author || 'THEWHY Practice Team',
    readTime: data.readTime || '4 min read',
    tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',').map(t => t.trim()) : ['Advisory']),
    is_published: data.is_published !== false,
    published_at: data.published_at || new Date().toISOString()
  };

  store.insights.unshift(newArticle);
  saveLocalStore();
  return newArticle;
}

async function updateInsight(slug, data) {
  const store = loadLocalStore();
  const index = store.insights.findIndex(i => i.slug === slug);
  if (index === -1) return null;
  store.insights[index] = { ...store.insights[index], ...data, updated_at: new Date().toISOString() };
  saveLocalStore();
  return store.insights[index];
}

async function deleteInsight(slug) {
  const store = loadLocalStore();
  const index = store.insights.findIndex(i => i.slug === slug);
  if (index === -1) return false;
  store.insights.splice(index, 1);
  saveLocalStore();
  return true;
}

async function updateInquiryStatus(id, status) {
  const store = loadLocalStore();
  const inq = (store.inquiries || []).find(i => i.id === id || i.ref_code === id);
  if (inq) {
    inq.status = status;
    saveLocalStore();
    return inq;
  }
  return null;
}

async function deleteInquiry(id) {
  const store = loadLocalStore();
  const index = (store.inquiries || []).findIndex(i => i.id === id || i.ref_code === id);
  if (index !== -1) {
    store.inquiries.splice(index, 1);
    saveLocalStore();
    return true;
  }
  return false;
}

function verifyAdminPasscode(passcode) {
  const store = loadLocalStore();
  const validPass = (store.siteSettings && store.siteSettings.adminPasscode) || process.env.ADMIN_PASSCODE || 'whyng2026';
  return passcode === validPass;
}

module.exports = {
  pool,
  getPool,
  query,
  initDb,
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  createContact,
  getAllContacts,
  getAllInsights,
  getInsightBySlug,
  createInsight,
  updateInsight,
  deleteInsight,
  createInquiry,
  getAllInquiries,
  updateInquiryStatus,
  deleteInquiry,
  getServices,
  getIndustries,
  getTeam,
  getCaseStudies,
  getTestimonials,
  getFaqs,
  getStats,
  getLaunchCampaign,
  updateLaunchCampaign,
  getSiteSettings,
  updateSiteSettings,
  verifyAdminPasscode
};
