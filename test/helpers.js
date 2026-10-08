/**
 * Shared test setup. Must be required BEFORE the app so the environment below
 * is in place when server.js / db.js load:
 *   - JSON store in a throwaway temp file (never the real runtime store)
 *   - MySQL disabled (DB_MODE=json)
 *   - fixed test passcode and session secret
 *   - email (SMTP / Brevo) and Cloudinary disabled, whatever .env contains
 */
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TEST_PASSCODE = 'test-passcode-for-automated-tests';
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyng-test-'));
const DB_JSON_PATH = path.join(tmpDir, 'db.json');

process.env.NODE_ENV = 'test';
process.env.DB_MODE = 'json';
process.env.DB_JSON_PATH = DB_JSON_PATH;
process.env.ADMIN_PASSCODE = TEST_PASSCODE;
process.env.ADMIN_SESSION_SECRET = crypto.randomBytes(32).toString('hex');
process.env.SITE_URL = 'https://why.ng';
// Never reach real services from tests. These are set (even empty) before the
// app loads, so dotenv cannot fill them in from a developer's .env file.
process.env.SMTP_HOST = '';
process.env.BREVO_API_KEY = '';
process.env.CLOUDINARY_URL = '';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';

const request = require('supertest');
const app = require('../server/server');
const db = require('../server/db/db');

async function init() {
  await db.initDb();
}

/** Sign in and return the Cookie header value to send on later requests. */
async function login() {
  const res = await request(app).post('/api/admin/verify').send({ passcode: TEST_PASSCODE });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  const setCookie = res.headers['set-cookie'] || [];
  const cookie = setCookie.find(c => c.startsWith('whyng_admin='));
  if (!cookie) throw new Error('no session cookie set');
  return cookie.split(';')[0];
}

function cleanup() {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) { /* ignore */ }
}

const validBooking = () => ({
  clientName: 'Adebayo Ogunlesi',
  email: 'adebayo@example.com',
  phone: '+234 803 000 0000',
  companyName: 'Apex Marine Logistics Ltd',
  service: 'General Strategic Advisory',
  meetingType: 'Virtual (Google Meet)',
  date: '2026-11-02',
  timeSlot: '10:00 AM - 10:45 AM',
  companySize: 'SME (10-100 staff)',
  message: 'Need help with a bank charges audit.',
  estimatedFee: ''
});

module.exports = { app, db, request, init, login, cleanup, TEST_PASSCODE, DB_JSON_PATH, validBooking };
