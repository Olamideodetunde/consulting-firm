/**
 * Minimal, dependency-free request validation.
 *
 * A schema maps field names to rules:
 *   { type: 'string' | 'email' | 'phone' | 'date' | 'boolean' | 'stringArray',
 *     required: boolean, max: number, min: number, enum: [...], pattern: RegExp,
 *     label: 'Human name', upper: boolean }
 *
 * validate(body, schema, { partial }) returns { ok, value, errors }.
 * - Unknown fields are rejected.
 * - Strings are trimmed; empty strings count as "not provided".
 * - Objects/arrays are rejected unless the rule type allows them.
 */

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"']+@[^\s@<>()[\]\\,;:"']+\.[A-Za-z]{2,}$/;
const PHONE_RE = /^[0-9+\-() ]{7,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function labelOf(field, rule) {
  return rule.label || field;
}

function validate(body, schema, opts = {}) {
  const errors = [];
  const value = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, value, errors: [{ field: null, message: 'Request body must be a JSON object.' }] };
  }

  for (const key of Object.keys(body)) {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      errors.push({ field: key, message: `Unknown field "${String(key).slice(0, 40)}".` });
    }
  }

  for (const [field, rule] of Object.entries(schema)) {
    const label = labelOf(field, rule);
    let raw = body[field];
    const present = raw !== undefined && raw !== null && !(typeof raw === 'string' && raw.trim() === '');

    if (!present) {
      if (rule.required && !opts.partial) errors.push({ field, message: `${label} is required.` });
      continue;
    }

    if (rule.type === 'boolean') {
      if (typeof raw === 'boolean') value[field] = raw;
      else if (raw === 'true' || raw === 'false') value[field] = raw === 'true';
      else errors.push({ field, message: `${label} must be true or false.` });
      continue;
    }

    if (rule.type === 'stringArray') {
      let arr = raw;
      if (typeof arr === 'string') arr = arr.split(',');
      if (!Array.isArray(arr) || arr.some(v => typeof v !== 'string')) {
        errors.push({ field, message: `${label} must be a list of text values.` });
        continue;
      }
      const cleaned = arr.map(v => v.trim()).filter(Boolean);
      const maxItems = rule.maxItems || 20;
      const maxLen = rule.max || 200;
      if (cleaned.length > maxItems || cleaned.some(v => v.length > maxLen)) {
        errors.push({ field, message: `${label} is too long.` });
        continue;
      }
      value[field] = cleaned;
      continue;
    }

    if (typeof raw === 'number' && Number.isFinite(raw)) raw = String(raw);
    if (typeof raw !== 'string') {
      errors.push({ field, message: `${label} must be text.` });
      continue;
    }

    let str = raw.trim();
    const max = rule.max || 500;
    if (str.length > max) {
      errors.push({ field, message: `${label} must be at most ${max} characters.` });
      continue;
    }
    if (rule.min && str.length < rule.min) {
      errors.push({ field, message: `${label} must be at least ${rule.min} characters.` });
      continue;
    }

    switch (rule.type) {
      case 'email':
        str = str.toLowerCase();
        if (!EMAIL_RE.test(str)) errors.push({ field, message: `${label} must be a valid email address.` });
        break;
      case 'phone':
        if (!PHONE_RE.test(str) || (str.match(/\d/g) || []).length < 7) {
          errors.push({ field, message: `${label} must be a valid phone number (digits, spaces, +, -, parentheses).` });
        }
        break;
      case 'date': {
        const d = new Date(`${str}T00:00:00Z`);
        if (!DATE_RE.test(str) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== str) {
          errors.push({ field, message: `${label} must be a date in YYYY-MM-DD format.` });
        }
        break;
      }
      default:
        break;
    }

    if (rule.upper) str = str.toUpperCase();
    if (rule.lower) str = str.toLowerCase();
    if (rule.enum && !rule.enum.includes(str)) {
      errors.push({ field, message: `${label} must be one of: ${rule.enum.join(', ')}.` });
      continue;
    }
    if (rule.pattern && !rule.pattern.test(str)) {
      errors.push({ field, message: `${label} has an invalid format.` });
      continue;
    }

    value[field] = str;
  }

  return { ok: errors.length === 0, value, errors };
}

/**
 * Express helper: validates req.body against a schema, replies 400 on failure,
 * otherwise stores the cleaned object on req.valid and calls next().
 */
function validateBody(schema, opts = {}) {
  return (req, res, next) => {
    const result = validate(req.body || {}, schema, opts);
    if (!result.ok) {
      return res.status(400).json({
        success: false,
        error: result.errors[0].message,
        details: result.errors
      });
    }
    if (opts.partial && Object.keys(result.value).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update.' });
    }
    req.valid = result.value;
    next();
  };
}

// ---------------------------------------------------------------------------
// Shared schemas and status whitelists
// ---------------------------------------------------------------------------
const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const INQUIRY_STATUSES = ['NEW', 'CONTACTED', 'RESPONDED', 'CLOSED'];
const CONTACT_STATUSES = ['unread', 'read', 'responded', 'archived'];

const schemas = {
  booking: {
    clientName: { type: 'string', required: true, max: 120, label: 'Full name' },
    email: { type: 'email', required: true, max: 160, label: 'Email' },
    phone: { type: 'phone', required: true, max: 20, label: 'Phone' },
    companyName: { type: 'string', max: 160, label: 'Company name' },
    service: { type: 'string', max: 160, label: 'Service' },
    meetingType: { type: 'string', max: 100, label: 'Meeting format' },
    date: { type: 'date', max: 10, label: 'Date' },
    timeSlot: { type: 'string', max: 60, label: 'Time slot' },
    companySize: { type: 'string', max: 100, label: 'Company size' },
    message: { type: 'string', max: 5000, label: 'Message' },
    estimatedFee: { type: 'string', max: 100, label: 'Estimated fee' }
  },
  bookingUpdate: {
    status: { type: 'string', upper: true, enum: BOOKING_STATUSES, max: 20, label: 'Status' },
    notes: { type: 'string', max: 5000, label: 'Notes' }
  },
  contact: {
    name: { type: 'string', required: true, max: 120, label: 'Name' },
    email: { type: 'email', required: true, max: 160, label: 'Email' },
    phone: { type: 'phone', max: 20, label: 'Phone' },
    subject: { type: 'string', max: 200, label: 'Subject' },
    message: { type: 'string', required: true, max: 5000, label: 'Message' }
  },
  contactUpdate: {
    status: { type: 'string', required: true, lower: true, enum: CONTACT_STATUSES, max: 20, label: 'Status' }
  },
  inquiry: {
    name: { type: 'string', required: true, max: 120, label: 'Name' },
    email: { type: 'email', required: true, max: 160, label: 'Email' },
    phone: { type: 'phone', max: 20, label: 'Phone' },
    company: { type: 'string', max: 160, label: 'Company' },
    serviceRequired: { type: 'string', max: 200, label: 'Service required' },
    message: { type: 'string', required: true, max: 5000, label: 'Message' }
  },
  inquiryUpdate: {
    status: { type: 'string', upper: true, enum: INQUIRY_STATUSES, max: 20, label: 'Status' }
  },
  newsletter: {
    email: { type: 'email', required: true, max: 160, label: 'Email' },
    name: { type: 'string', max: 120, label: 'Name' },
    source: { type: 'string', max: 60, label: 'Source' }
  },
  insight: {
    title: { type: 'string', required: true, max: 300, label: 'Title' },
    category: { type: 'string', max: 100, label: 'Category' },
    excerpt: { type: 'string', max: 1000, label: 'Excerpt' },
    content: { type: 'string', required: true, max: 150000, label: 'Content' },
    cover_image: {
      type: 'string', max: 500, label: 'Cover image',
      pattern: /^(https:\/\/[^\s"'<>]+|\/?[A-Za-z0-9_\-./%]+)$/
    },
    author: { type: 'string', max: 200, label: 'Author' },
    readTime: { type: 'string', max: 50, label: 'Read time' },
    tags: { type: 'stringArray', max: 60, maxItems: 20, label: 'Tags' },
    is_published: { type: 'boolean', label: 'Published' }
  },
  adminLogin: {
    passcode: { type: 'string', required: true, max: 256, label: 'Passcode' }
  },
  siteSettings: {
    announcement: { type: 'string', max: 300, label: 'Announcement' },
    heroHeadline: { type: 'string', max: 300, label: 'Hero headline' },
    heroSubtitle: { type: 'string', max: 600, label: 'Hero subtitle' },
    phone: { type: 'string', max: 40, label: 'Phone' },
    email: { type: 'email', max: 160, label: 'Email' },
    addressYaba: { type: 'string', max: 300, label: 'Yaba address' },
    addressIkeja: { type: 'string', max: 300, label: 'Ikeja address' },
    affiliate: { type: 'string', max: 300, label: 'Affiliate line' }
  },
  launchCampaign: {
    title: { type: 'string', max: 300, label: 'Title' },
    badge: { type: 'string', max: 200, label: 'Badge' },
    headline: { type: 'string', max: 300, label: 'Headline' },
    subtitle: { type: 'string', max: 1000, label: 'Subtitle' },
    startDate: { type: 'string', max: 100, label: 'Start date' },
    format: { type: 'string', max: 300, label: 'Format' },
    targetAudience: { type: 'string', max: 500, label: 'Target audience' },
    status: { type: 'string', max: 50, label: 'Status' },
    benefits: { type: 'stringArray', max: 300, maxItems: 20, label: 'Benefits' }
  }
};

// Keys of siteSettings that are safe to expose publicly via GET /api/settings.
const PUBLIC_SETTINGS_KEYS = Object.keys(schemas.siteSettings);

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

module.exports = {
  validate,
  validateBody,
  schemas,
  pick,
  PUBLIC_SETTINGS_KEYS,
  BOOKING_STATUSES,
  INQUIRY_STATUSES,
  CONTACT_STATUSES,
  EMAIL_RE,
  PHONE_RE
};
