/**
 * Migration & Database Initializer Script
 * Run via `npm run migrate` or `node server/db/migrate.js`
 */
require('dotenv').config();
const { initDb } = require('./db');

async function run() {
  console.log('--- THEWHY Consulting Database Migration ---');
  try {
    await initDb();
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

run();
