/**
 * Migration & Database Initializer Script
 * Run via `npm run migrate` or `node server/db/migrate.js`
 *
 * Creates/upgrades all MySQL tables (bookings, contact_submissions, inquiries,
 * insights, newsletter_subscribers, site_settings, launch_campaign), adds missing
 * columns (e.g. inquiries.company, *.uid) and seeds default content.
 * Exits non-zero if MySQL is not reachable.
 */
require('dotenv').config();
const db = require('./db');

async function run() {
  console.log('--- THEWHY Consulting Database Migration ---');
  if ((process.env.DB_MODE || '').toLowerCase() === 'json') {
    console.error('DB_MODE=json is set; nothing to migrate. Unset it to migrate MySQL.');
    process.exit(1);
  }
  try {
    const mode = await db.initDb();
    if (mode !== 'mysql') {
      console.error('Migration failed: MySQL is not reachable (the app would run in JSON fallback mode).');
      process.exit(1);
    }
    console.log('Migration completed successfully.');
    await db.closeDb();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

run();
