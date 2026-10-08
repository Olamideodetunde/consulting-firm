/**
 * Cloudinary image uploads for the admin console (no SDK dependency).
 *
 * Flow: the admin browser asks the server for a short-lived signature
 * (POST /api/admin/uploads/sign, admin session required), then uploads the file
 * straight to Cloudinary. The API secret never leaves the server, the file never
 * passes through this app (so the 20kb JSON body limit is unaffected), and
 * Cloudinary rejects any upload whose folder/format/timestamp were altered.
 *
 * Config (either form):
 *   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
 *   or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * Optional: CLOUDINARY_FOLDER (default "whyng/insights").
 */
const crypto = require('crypto');

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB (Cloudinary's free plan caps images at 10 MB)

function config() {
  let cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  let apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  let apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
  const url = (process.env.CLOUDINARY_URL || '').trim();
  if (url && (!cloudName || !apiKey || !apiSecret)) {
    const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (m) {
      apiKey = apiKey || decodeURIComponent(m[1]);
      apiSecret = apiSecret || decodeURIComponent(m[2]);
      cloudName = cloudName || m[3].replace(/\/+$/, '');
    }
  }
  const folder = (process.env.CLOUDINARY_FOLDER || 'whyng/insights').trim().replace(/^\/+|\/+$/g, '');
  return { cloudName, apiKey, apiSecret, folder };
}

function isConfigured() {
  const c = config();
  return !!(c.cloudName && c.apiKey && c.apiSecret);
}

/**
 * Cloudinary signature: every signed param except file/cloud_name/resource_type/api_key,
 * sorted by key, joined as k=v with '&', then the API secret appended; SHA-1 hex.
 */
function sign(params, apiSecret) {
  const toSign = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map(k => `${k}=${Array.isArray(params[k]) ? params[k].join(',') : params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

/** Parameters the browser needs for one signed upload (valid ~1 hour per Cloudinary). */
function uploadSignature(now = Date.now()) {
  const c = config();
  if (!isConfigured()) {
    const err = new Error('Image uploads are not configured. Add your Cloudinary credentials to .env.');
    err.status = 503;
    throw err;
  }
  const params = {
    timestamp: Math.floor(now / 1000),
    folder: c.folder,
    allowed_formats: ALLOWED_FORMATS.join(',')
  };
  return {
    cloudName: c.cloudName,
    apiKey: c.apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(c.cloudName)}/image/upload`,
    ...params,
    signature: sign(params, c.apiSecret),
    maxBytes: MAX_BYTES,
    allowedFormats: ALLOWED_FORMATS
  };
}

/**
 * Delivery URL with automatic format/quality and a sensible max width, e.g.
 * https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_limit,w_1600/v1/<id>.jpg
 * Only rewrites URLs on this account's res.cloudinary.com path.
 */
function optimizedUrl(secureUrl, width = 1600) {
  const c = config();
  const prefix = `https://res.cloudinary.com/${c.cloudName}/image/upload/`;
  if (!c.cloudName || typeof secureUrl !== 'string' || !secureUrl.startsWith(prefix)) return secureUrl;
  const rest = secureUrl.slice(prefix.length);
  if (/^f_auto/.test(rest)) return secureUrl;
  return `${prefix}f_auto,q_auto,c_limit,w_${width}/${rest}`;
}

/** Recent uploads in the configured folder (Admin API, basic auth). */
async function listUploads(maxResults = 50) {
  const c = config();
  if (!isConfigured()) return [];
  const qs = new URLSearchParams({
    type: 'upload',
    prefix: `${c.folder}/`,
    max_results: String(Math.min(Math.max(maxResults, 1), 100))
  });
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(c.cloudName)}/resources/image?${qs}`,
    {
      headers: { Authorization: `Basic ${Buffer.from(`${c.apiKey}:${c.apiSecret}`).toString('base64')}` },
      signal: AbortSignal.timeout(10000)
    }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Cloudinary ${res.status}: ${(body.error && body.error.message) || res.statusText}`);
    err.status = 502;
    throw err;
  }
  return (body.resources || [])
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map(r => ({
      name: `${r.public_id.split('/').pop()}.${r.format}`,
      path: optimizedUrl(r.secure_url),
      thumb: optimizedUrl(r.secure_url, 400),
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      created_at: r.created_at,
      source: 'cloudinary'
    }));
}

module.exports = {
  ALLOWED_FORMATS,
  MAX_BYTES,
  config,
  isConfigured,
  sign,
  uploadSignature,
  optimizedUrl,
  listUploads
};
