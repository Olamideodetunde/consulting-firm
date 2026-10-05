/**
 * Email notifications.
 *
 * Transport (first one configured wins):
 *   1. Brevo transactional API — BREVO_API_KEY (an "xkeysib-..." API key)
 *   2. SMTP via nodemailer     — SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 * Shared: MAIL_FROM ("Name <email>"), NOTIFY_TO (default info@thewhy.ng).
 *
 * All sends are fire-and-forget: they run after the HTTP response path and any
 * failure is logged, never thrown. With no transport configured the mailer is a
 * no-op and logs "[MAIL] Email not configured, skipping" once.
 */
const nodemailer = require('nodemailer');
const { escapeHtml } = require('../lib/util');

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const BREVO_TIMEOUT_MS = 10000;

let transporter = null;
let warnedNotConfigured = false;

function settings() {
  return {
    brevoApiKey: (process.env.BREVO_API_KEY || '').trim(),
    host: (process.env.SMTP_HOST || '').trim(),
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'THEWHY Consulting <info@thewhy.ng>',
    notifyTo: process.env.NOTIFY_TO || 'info@thewhy.ng',
    siteUrl: (process.env.SITE_URL || 'https://why.ng').replace(/\/+$/, '')
  };
}

function provider() {
  const s = settings();
  if (s.brevoApiKey) return 'brevo';
  if (s.host) return 'smtp';
  return null;
}

function isConfigured() {
  return provider() !== null;
}

/** Split "Name <email@x>" (or a bare address) into { name, email }. */
function parseAddress(value) {
  const str = String(value || '').trim();
  const m = str.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return m[1] ? { name: m[1].trim(), email: m[2].trim() } : { email: m[2].trim() };
  return { email: str };
}

async function sendViaBrevo(s, { to, subject, html, text, replyTo }) {
  const payload = {
    sender: parseAddress(s.from),
    to: String(to).split(',').map(addr => parseAddress(addr)).filter(a => a.email),
    subject,
    htmlContent: html
  };
  if (text) payload.textContent = text;
  if (replyTo) payload.replyTo = parseAddress(replyTo);

  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': s.brevoApiKey,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(BREVO_TIMEOUT_MS)
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Brevo API ${res.status}: ${body.message || body.code || res.statusText}`);
  }
  return { messageId: body.messageId };
}

function getTransporter() {
  if (transporter) return transporter;
  const s = settings();
  transporter = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,
    auth: s.user ? { user: s.user, pass: s.pass } : undefined
  });
  return transporter;
}

/** Strip CR/LF so user values can never inject extra mail headers. */
function headerSafe(value, max = 200) {
  return String(value || '').replace(/[\r\n]+/g, ' ').slice(0, max);
}

async function send({ to, subject, html, text, replyTo }) {
  const via = provider();
  if (!via) {
    if (!warnedNotConfigured) {
      console.log('[MAIL] Email not configured, skipping');
      warnedNotConfigured = true;
    }
    return { skipped: true };
  }
  const s = settings();
  if (via === 'brevo') {
    return sendViaBrevo(s, {
      to,
      subject: headerSafe(subject),
      html,
      text,
      replyTo: replyTo ? headerSafe(replyTo) : undefined
    });
  }
  return getTransporter().sendMail({
    from: s.from,
    to,
    subject: headerSafe(subject),
    html,
    text,
    replyTo: replyTo ? headerSafe(replyTo) : undefined
  });
}

/** Queue a send without awaiting; errors are logged only. */
function sendLater(message) {
  setImmediate(() => {
    send(message).catch(err => console.error('[MAIL] Send failed:', err.message));
  });
}

// ---------------------------------------------------------------------------
// Templates
//
// Table-based, inline-styled markup so it renders consistently in Gmail,
// Outlook and Apple Mail. No remote images: the wordmark is pure text, so the
// email looks right even with images blocked. Every user value goes through
// escapeHtml (or is emitted via the text helpers below).
// ---------------------------------------------------------------------------
const BRAND = {
  navy: '#0F172A',
  orange: '#EF4C20',
  orangeStrong: '#B93A12',
  gold: '#F8C638',
  ink: '#1E293B',
  muted: '#64748B',
  line: '#E2E8F0',
  paper: '#F6F3EE',
  soft: '#F8FAFC',
  phone: '+234-8034-99-23-18',
  phoneHref: 'tel:+2348034992318',
  email: 'info@thewhy.ng',
  whatsapp: 'https://wa.me/2348034992318',
  address: '1a Hughes Avenue, Alagomeji, Yaba, Lagos, Nigeria'
};
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function layout(title, bodyHtml, opts = {}) {
  const { preheader = '', eyebrow = '' } = opts;
  const s = settings();
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
<style>
  @media only screen and (max-width: 620px) {
    .wrap { padding: 12px 0 !important; }
    .card { border-radius: 0 !important; }
    .pad { padding-left: 22px !important; padding-right: 22px !important; }
    .h1 { font-size: 22px !important; line-height: 30px !important; }
    .tagline { display: none !important; }
    .kv td { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
    .kv .k { padding-bottom: 0 !important; border-bottom: 0 !important; }
    .kv .v { padding-top: 2px !important; }
    .btn-cell { display: block !important; width: 100% !important; padding: 0 0 10px 0 !important; }
    .btn a { display: block !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="wrap" style="background:${BRAND.paper};padding:32px 0;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="card" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
    <tr><td class="pad" style="background:${BRAND.navy};padding:26px 36px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${FONT};">
          <div style="font-size:22px;line-height:24px;font-weight:800;letter-spacing:1px;color:#ffffff;">THE<span style="color:${BRAND.orange};">WHY</span></div>
          <div style="font-size:10px;line-height:14px;font-weight:700;letter-spacing:4px;color:#CBD5E1;margin-top:3px;">CONSULTING</div>
        </td>
        <td align="right" class="tagline" style="font-family:${FONT};font-size:11px;line-height:16px;color:#94A3B8;letter-spacing:0.5px;">Management Consulting<br>&amp; Advisory &middot; Lagos</td>
      </tr></table>
    </td></tr>
    <tr><td style="height:4px;line-height:4px;font-size:0;background:${BRAND.orange};background-image:linear-gradient(90deg,${BRAND.orange},${BRAND.gold});">&nbsp;</td></tr>
    <tr><td class="pad" style="padding:36px 36px 8px;font-family:${FONT};color:${BRAND.ink};">
      ${eyebrow ? `<div style="font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${BRAND.orangeStrong};margin:0 0 10px;">${escapeHtml(eyebrow)}</div>` : ''}
      <h1 class="h1" style="margin:0 0 20px;font-size:26px;line-height:34px;font-weight:800;color:${BRAND.navy};">${escapeHtml(title)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td class="pad" style="padding:8px 36px 32px;font-family:${FONT};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BRAND.line};"><tr>
        <td style="padding-top:20px;font-size:13px;line-height:20px;color:${BRAND.muted};">
          Questions? Call <a href="${BRAND.phoneHref}" style="color:${BRAND.orangeStrong};text-decoration:none;font-weight:600;">${BRAND.phone}</a>
          or <a href="${BRAND.whatsapp}" style="color:${BRAND.orangeStrong};text-decoration:none;font-weight:600;">chat on WhatsApp</a>.
        </td>
      </tr></table>
    </td></tr>
    <tr><td class="pad" style="background:${BRAND.navy};padding:24px 36px;font-family:${FONT};font-size:12px;line-height:19px;color:#94A3B8;">
      <strong style="color:#ffffff;">THEWHY Consulting</strong><br>
      ${BRAND.address}<br>
      <a href="${BRAND.phoneHref}" style="color:#CBD5E1;text-decoration:none;">${BRAND.phone}</a> &middot;
      <a href="mailto:${BRAND.email}" style="color:#CBD5E1;text-decoration:none;">${BRAND.email}</a> &middot;
      <a href="${escapeHtml(s.siteUrl)}" style="color:#CBD5E1;text-decoration:none;">${escapeHtml(s.siteUrl.replace(/^https?:\/\//, ''))}</a>
      <div style="margin-top:12px;color:#64748B;font-size:11px;line-height:17px;">An affiliate of Wale Kehinde &amp; Co. (Chartered Accountants). All engagements are handled under strict confidentiality.</div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function paragraph(text, opts = {}) {
  const size = opts.lead ? '16px' : '15px';
  const lh = opts.lead ? '26px' : '24px';
  return `<p style="margin:0 0 16px;font-size:${size};line-height:${lh};color:${BRAND.ink};">${escapeHtml(text)}</p>`;
}

function refCard(label, code) {
  if (!code) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;background:${BRAND.paper};border:1px solid #EADFD3;border-radius:12px;">
<tr><td style="padding:18px 22px;font-family:${FONT};">
  <div style="font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(label)}</div>
  <div style="font-family:Consolas,'SFMono-Regular',Menlo,monospace;font-size:22px;line-height:30px;font-weight:700;letter-spacing:1px;color:${BRAND.navy};margin-top:4px;">${escapeHtml(code)}</div>
</td></tr></table>`;
}

function sectionTitle(text) {
  return `<div style="font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND.navy};margin:8px 0 10px;">${escapeHtml(text)}</div>`;
}

const present = v => v !== undefined && v !== null && String(v).trim() !== '';

function detailsTable(rows) {
  const trs = rows
    .filter(([, v]) => present(v))
    .map(([k, v]) => `<tr>
<td class="k" width="38%" style="padding:11px 14px 11px 0;border-bottom:1px solid ${BRAND.line};font-size:13px;line-height:20px;color:${BRAND.muted};vertical-align:top;">${escapeHtml(k)}</td>
<td class="v" style="padding:11px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;line-height:20px;color:${BRAND.ink};font-weight:600;vertical-align:top;word-break:break-word;">${escapeHtml(v)}</td>
</tr>`)
    .join('');
  if (!trs) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="kv" style="margin:0 0 24px;font-family:${FONT};border-top:1px solid ${BRAND.line};">${trs}</table>`;
}

function messageBlock(label, text) {
  if (!present(text)) return '';
  return `${sectionTitle(label)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
<td style="border-left:4px solid ${BRAND.orange};background:${BRAND.soft};padding:14px 18px;font-family:${FONT};font-size:14px;line-height:22px;color:${BRAND.ink};white-space:pre-wrap;border-radius:0 8px 8px 0;">${escapeHtml(text)}</td>
</tr></table>`;
}

function steps(items) {
  const rows = items.map((item, i) => `<tr>
<td width="40" valign="top" style="padding:0 0 14px;">
  <div style="width:28px;height:28px;line-height:28px;border-radius:14px;background:${BRAND.navy};color:#ffffff;font-family:${FONT};font-size:13px;font-weight:700;text-align:center;">${i + 1}</div>
</td>
<td valign="top" style="padding:3px 0 14px;font-family:${FONT};font-size:14px;line-height:22px;color:${BRAND.ink};">${escapeHtml(item)}</td>
</tr>`).join('');
  return `${sectionTitle('What happens next')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">${rows}</table>`;
}

/** buttons: [{ label, href, variant: 'primary'|'ghost' }] (hrefs are escaped). */
function buttons(list) {
  const cells = list.filter(b => b && b.href).map((b) => {
    const primary = b.variant !== 'ghost';
    const bg = primary ? BRAND.orangeStrong : '#ffffff';
    const color = primary ? '#ffffff' : BRAND.navy;
    const border = primary ? BRAND.orangeStrong : '#CBD5E1';
    return `<td class="btn-cell" style="padding:0 10px 10px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn"><tr>
<td align="center" style="border-radius:10px;background:${bg};border:1px solid ${border};">
<a href="${escapeHtml(b.href)}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:14px;line-height:18px;font-weight:700;color:${color};text-decoration:none;border-radius:10px;">${escapeHtml(b.label)}</a>
</td></tr></table></td>`;
  }).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;"><tr>${cells}</tr></table>`;
}

function signOff() {
  return `<p style="margin:8px 0 0;font-size:15px;line-height:24px;color:${BRAND.ink};">Warm regards,<br><strong>The THEWHY Consulting Team</strong></p>`;
}

function detailsText(rows) {
  return rows
    .filter(([, v]) => present(v))
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/** '2026-10-20' -> 'Tuesday, 20 October 2026'; anything else is returned unchanged. */
function prettyDate(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return value;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Turn a Nigerian/international phone number into a wa.me link, or ''. */
function whatsappLink(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 11) digits = `234${digits.slice(1)}`;
  return digits.length >= 10 ? `https://wa.me/${digits}` : '';
}

function internal({ subject, title, eyebrow, ref, rows, message, contact }) {
  const s = settings();
  const reply = contact && contact.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent(`Re: ${subject}`)}`
    : '';
  const body = refCard('Reference', ref)
    + detailsTable(rows)
    + messageBlock('Message from client', message)
    + buttons([
      { label: 'Reply to client', href: reply },
      { label: 'WhatsApp client', href: whatsappLink(contact && contact.phone), variant: 'ghost' },
      { label: 'Open admin console', href: `${s.siteUrl}/admin`, variant: 'ghost' }
    ]);
  sendLater({
    to: s.notifyTo,
    subject,
    replyTo: contact && contact.email,
    html: layout(title, body, { eyebrow, preheader: `${title}${ref ? ` (${ref})` : ''}` }),
    text: `${title}\n\n${ref ? `Reference: ${ref}\n` : ''}${detailsText(rows)}${present(message) ? `\n\nMessage:\n${message}` : ''}\n\nAdmin: ${s.siteUrl}/admin`
  });
}

function clientConfirmation({ to, subject, title, eyebrow, preheader, greeting, paragraphs, ref, refLabel = 'Your reference', rows = [], next = [], actions = [] }) {
  const s = settings();
  const html = paragraph(greeting, { lead: true })
    + paragraphs.map(p => paragraph(p)).join('')
    + refCard(refLabel, ref)
    + (rows.length ? `${sectionTitle('Summary')}${detailsTable(rows)}` : '')
    + (next.length ? steps(next) : '')
    + buttons(actions.length ? actions : [
      { label: 'Chat with us on WhatsApp', href: BRAND.whatsapp },
      { label: 'Visit our website', href: s.siteUrl, variant: 'ghost' }
    ])
    + signOff();
  const textParts = [greeting, ...paragraphs];
  if (ref) textParts.push(`${refLabel}: ${ref}`);
  if (rows.length) textParts.push(detailsText(rows));
  if (next.length) textParts.push(`What happens next:\n${next.map((n, i) => `${i + 1}. ${n}`).join('\n')}`);
  textParts.push(`Questions? Call ${BRAND.phone} or WhatsApp ${BRAND.whatsapp}`);
  textParts.push('Warm regards,\nThe THEWHY Consulting Team');
  sendLater({
    to,
    subject,
    replyTo: s.notifyTo,
    html: layout(title, html, { eyebrow, preheader }),
    text: textParts.join('\n\n')
  });
}

// ---------------------------------------------------------------------------
// Public notification helpers
// ---------------------------------------------------------------------------
function notifyNewBooking(b) {
  try {
    const s = settings();
    internal({
      subject: `New consultation booking ${b.ref_code}: ${b.clientName}`,
      title: 'New consultation booking',
      eyebrow: 'Booking request',
      ref: b.ref_code,
      rows: [
        ['Client', b.clientName], ['Company', b.companyName], ['Email', b.email], ['Phone', b.phone],
        ['Service', b.service], ['Format', b.meetingType], ['Requested date', prettyDate(b.date)], ['Time slot', b.timeSlot],
        ['Company size', b.companySize], ['Estimated fee', b.estimatedFee]
      ],
      message: b.message,
      contact: { email: b.email, phone: b.phone }
    });
    const calendarId = b.id || b.ref_code;
    clientConfirmation({
      to: b.email,
      subject: `We have received your consultation request (${b.ref_code})`,
      title: 'Your consultation request is in',
      eyebrow: 'Consultation request',
      preheader: `Reference ${b.ref_code}. A partner will contact you within 24 hours.`,
      greeting: `Dear ${b.clientName},`,
      paragraphs: [
        'Thank you for choosing THEWHY Consulting. We have received your request for an advisory session, and a partner will personally review it before we speak.'
      ],
      ref: b.ref_code,
      rows: [['Service', b.service], ['Format', b.meetingType], ['Requested date', prettyDate(b.date)], ['Time slot', b.timeSlot]],
      next: [
        'A partner reviews your request and the challenge you described.',
        'We contact you within 24 hours to confirm the date, time and meeting format.',
        'Your 45-minute session takes place under strict confidentiality (NDA available on request).'
      ],
      actions: [
        { label: 'Add to calendar', href: calendarId ? `${s.siteUrl}/api/bookings/${encodeURIComponent(calendarId)}/calendar.ics` : '' },
        { label: 'Chat on WhatsApp', href: BRAND.whatsapp, variant: 'ghost' }
      ]
    });
  } catch (err) {
    console.error('[MAIL] notifyNewBooking error:', err.message);
  }
}

function notifyNewContact(c) {
  try {
    internal({
      subject: `New contact message: ${c.subject}`,
      title: 'New contact message',
      eyebrow: 'Website enquiry',
      ref: c.ref_code,
      rows: [['Name', c.name], ['Email', c.email], ['Phone', c.phone], ['Subject', c.subject]],
      message: c.message,
      contact: { email: c.email, phone: c.phone }
    });
    clientConfirmation({
      to: c.email,
      subject: 'We have received your message | THEWHY Consulting',
      title: 'Thank you for reaching out',
      eyebrow: 'Message received',
      preheader: 'A consultant from our Lagos office will respond shortly.',
      greeting: `Dear ${c.name},`,
      paragraphs: [
        'Thank you for contacting THEWHY Consulting. Your message has reached our Lagos office, and a consultant will respond within one business day.',
        'If your matter is urgent, such as a tax deadline or a bank action, call or WhatsApp us directly and quote your reference.'
      ],
      ref: c.ref_code,
      rows: [['Subject', c.subject]]
    });
  } catch (err) {
    console.error('[MAIL] notifyNewContact error:', err.message);
  }
}

function notifyNewInquiry(inq) {
  try {
    const isApplication = /bootcamp|programme|program|launch/i.test(inq.serviceRequired || '');
    const kind = isApplication ? 'programme application' : 'inquiry';
    internal({
      subject: `New ${kind}: ${inq.name}`,
      title: isApplication ? 'New programme application' : 'New inquiry',
      eyebrow: isApplication ? 'Bootcamp application' : 'Service inquiry',
      ref: inq.ref_code,
      rows: [
        ['Name', inq.name], ['Company', inq.company], ['Email', inq.email],
        ['Phone', inq.phone], ['Service / programme', inq.serviceRequired]
      ],
      message: inq.message,
      contact: { email: inq.email, phone: inq.phone }
    });
    clientConfirmation({
      to: inq.email,
      subject: isApplication ? 'Your THEWHY programme application' : 'Your inquiry | THEWHY Consulting',
      title: isApplication ? 'Your application has been received' : 'Your inquiry has been received',
      eyebrow: isApplication ? 'Programme application' : 'Inquiry received',
      preheader: isApplication
        ? 'Our admissions panel will contact you with next steps.'
        : 'A consultant will respond within 24 hours.',
      greeting: `Dear ${inq.name},`,
      paragraphs: [
        isApplication
          ? `Thank you for applying to the ${inq.serviceRequired}. We are glad you are investing in your leadership and your business.`
          : 'Thank you for your inquiry. A consultant will review it and respond within 24 hours.'
      ],
      ref: inq.ref_code,
      rows: [['Programme / service', inq.serviceRequired], ['Company', inq.company]],
      next: isApplication
        ? [
          'Our admissions panel reviews your application and business profile.',
          'We contact you to confirm your seat, cohort dates and programme fees.',
          'You receive your onboarding pack before the first session.'
        ]
        : []
    });
  } catch (err) {
    console.error('[MAIL] notifyNewInquiry error:', err.message);
  }
}

// For tests.
function _reset() {
  transporter = null;
  warnedNotConfigured = false;
}

module.exports = {
  isConfigured,
  provider,
  send,
  sendLater,
  notifyNewBooking,
  notifyNewContact,
  notifyNewInquiry,
  _parseAddress: parseAddress,
  _layout: layout,
  _detailsTable: detailsTable,
  _reset
};
