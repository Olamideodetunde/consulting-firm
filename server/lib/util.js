/**
 * Small shared helpers: HTML escaping, CSV encoding, reference codes.
 */
const crypto = require('crypto');

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Encode one CSV cell. Always quoted; embedded quotes doubled.
 * Cells starting with = + - @ TAB or CR are prefixed with a single quote so
 * spreadsheet apps do not evaluate them as formulas (CSV/formula injection).
 */
function csvCell(value) {
  let s;
  if (value === null || value === undefined) s = '';
  else if (value instanceof Date) s = Number.isNaN(value.getTime()) ? '' : value.toISOString();
  else s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n') + '\r\n';
}

// Unambiguous uppercase alphabet (no I, O, 0, 1): 32 symbols = 5 bits each.
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomRef(len = 10) {
  let out = '';
  for (let i = 0; i < len; i++) out += REF_ALPHABET[crypto.randomInt(REF_ALPHABET.length)];
  return out;
}

/** Human-friendly reference code, e.g. WHY-2026-7KQ4XM2PZD (10 random chars, ~50 bits). */
function makeRefCode(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${randomRef(10)}`;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 150) || 'insight';
}

/** Wrap an async Express handler so rejections reach the error middleware. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { wrap, escapeHtml, csvCell, toCsv, makeRefCode, randomRef, slugify };
