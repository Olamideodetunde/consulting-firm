/**
 * Admin authentication.
 *
 * - The admin passcode comes ONLY from env ADMIN_PASSCODE.
 *   * production: refuse to start if unset, the legacy default, or shorter than 12 chars.
 *   * development/test: if unset, a random passcode is generated and printed once.
 * - A successful login sets an HttpOnly, SameSite=Strict cookie (Secure in production)
 *   holding an HMAC-SHA256-signed token: base64url(payload).base64url(signature).
 *   The payload carries an expiry (8h) and a fingerprint of the current passcode,
 *   so rotating ADMIN_PASSCODE invalidates existing sessions.
 * - Signing key: env ADMIN_SESSION_SECRET (required in production), otherwise a
 *   random per-process secret.
 */
const crypto = require('crypto');

const COOKIE_NAME = 'whyng_admin';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LEGACY_DEFAULTS = ['whyng2026', 'change-me-to-a-long-random-string'];

let config = null;
const revoked = new Map(); // signature -> expiry (ms), for logout

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Resolve passcode and secret from the environment. Throws in production when
 * the configuration is unsafe. Safe to call multiple times (re-reads env).
 */
function initAuth({ logger = console } = {}) {
  const prod = isProduction();
  let passcode = (process.env.ADMIN_PASSCODE || '').trim();
  let secret = (process.env.ADMIN_SESSION_SECRET || '').trim();
  let generatedPasscode = false;

  if (prod) {
    if (!passcode) {
      throw new Error('[AUTH] ADMIN_PASSCODE is not set. Refusing to start in production. Set a long random ADMIN_PASSCODE in the environment.');
    }
    if (LEGACY_DEFAULTS.includes(passcode)) {
      throw new Error('[AUTH] ADMIN_PASSCODE is set to a published default value. Refusing to start in production. Choose a new long random passcode.');
    }
    if (passcode.length < 12) {
      throw new Error('[AUTH] ADMIN_PASSCODE must be at least 12 characters in production.');
    }
    if (!secret || secret.length < 32) {
      throw new Error('[AUTH] ADMIN_SESSION_SECRET must be set (at least 32 characters) in production.');
    }
  } else {
    if (!passcode) {
      passcode = crypto.randomBytes(12).toString('base64url');
      generatedPasscode = true;
      logger.warn('=======================================================');
      logger.warn('[AUTH] WARNING: ADMIN_PASSCODE is not set.');
      logger.warn(`[AUTH] Generated a temporary admin passcode for this run: ${passcode}`);
      logger.warn('[AUTH] Set ADMIN_PASSCODE in .env to keep a stable passcode.');
      logger.warn('=======================================================');
    } else if (LEGACY_DEFAULTS.includes(passcode)) {
      logger.warn('[AUTH] WARNING: ADMIN_PASSCODE uses a published default value. Change it before deploying.');
    }
    if (!secret) {
      secret = crypto.randomBytes(32).toString('hex');
    }
  }

  config = {
    passcodeHash: crypto.createHash('sha256').update(passcode, 'utf8').digest(),
    secret,
    fingerprint: crypto.createHmac('sha256', secret).update(`pc:${passcode}`).digest('base64url').slice(0, 16),
    generatedPasscode
  };
  return { generatedPasscode };
}

function getConfig() {
  if (!config) initAuth();
  return config;
}

/** Constant-time passcode comparison (hash both sides so lengths always match). */
function verifyPasscode(candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 256) return false;
  const cfg = getConfig();
  const candidateHash = crypto.createHash('sha256').update(candidate.trim(), 'utf8').digest();
  return crypto.timingSafeEqual(candidateHash, cfg.passcodeHash);
}

function sign(data) {
  return crypto.createHmac('sha256', getConfig().secret).update(data).digest('base64url');
}

function createSessionToken(now = Date.now()) {
  const payload = {
    sub: 'admin',
    iat: now,
    exp: now + SESSION_TTL_MS,
    fp: getConfig().fingerprint,
    n: crypto.randomBytes(8).toString('base64url')
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function verifySessionToken(token, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 1024) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (revoked.has(sig)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
  if (!payload || payload.sub !== 'admin' || typeof payload.exp !== 'number') return null;
  if (payload.exp <= now) return null;
  if (payload.fp !== getConfig().fingerprint) return null;
  return payload;
}

function revokeToken(token) {
  if (typeof token !== 'string') return;
  const payload = verifySessionToken(token);
  if (!payload) return;
  const sig = token.split('.')[1];
  revoked.set(sig, payload.exp);
  const now = Date.now();
  for (const [s, exp] of revoked) if (exp <= now) revoked.delete(s);
}

function parseCookies(header) {
  const out = {};
  if (!header || typeof header !== 'string') return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key || Object.prototype.hasOwnProperty.call(out, key)) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch (e) {
      out[key] = val;
    }
  }
  return out;
}

function getTokenFromRequest(req) {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] || null;
}

function isAdminRequest(req) {
  return !!verifySessionToken(getTokenFromRequest(req));
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction(),
    path: '/',
    maxAge: SESSION_TTL_MS
  };
}

function setSessionCookie(res) {
  const token = createSessionToken();
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return token;
}

function clearSessionCookie(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
}

/** Express middleware: 401 JSON unless the request carries a valid admin session. */
function requireAdmin(req, res, next) {
  const payload = verifySessionToken(getTokenFromRequest(req));
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  req.admin = payload;
  next();
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_MS,
  initAuth,
  verifyPasscode,
  createSessionToken,
  verifySessionToken,
  revokeToken,
  parseCookies,
  getTokenFromRequest,
  isAdminRequest,
  setSessionCookie,
  clearSessionCookie,
  requireAdmin
};
