/**
 * Email notifications (nodemailer).
 *
 * Configured from env: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
 * MAIL_FROM, NOTIFY_TO (default info@thewhy.ng).
 *
 * All sends are fire-and-forget: they run after the HTTP response path and any
 * failure is logged, never thrown. Without SMTP_HOST the mailer is a no-op and
 * logs "[MAIL] SMTP not configured, skipping" once.
 */
const nodemailer = require('nodemailer');
const { escapeHtml } = require('../lib/util');

let transporter = null;
let warnedNotConfigured = false;

function settings() {
  return {
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

function isConfigured() {
  return !!settings().host;
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
  if (!isConfigured()) {
    if (!warnedNotConfigured) {
      console.log('[MAIL] SMTP not configured, skipping');
      warnedNotConfigured = true;
    }
    return { skipped: true };
  }
  const s = settings();
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
// ---------------------------------------------------------------------------
function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0F172A;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:bold;">THEWHY <span style="color:#EF4C20;">Consulting</span></td></tr>
<tr><td style="padding:28px;">
<h1 style="font-size:20px;margin:0 0 16px;color:#0F172A;">${escapeHtml(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;font-size:12px;color:#64748b;">
THEWHY Consulting &middot; 1a Hughes Avenue, Alagomeji, Yaba, Lagos &middot; +234-8034-99-23-18 &middot; info@thewhy.ng<br>
An affiliate of Wale Kehinde &amp; Co. (Chartered Accountants)
</td></tr></table></td></tr></table></body></html>`;
}

function detailsTable(rows) {
  const trs = rows
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap;">${escapeHtml(k)}</td>`
      + `<td style="padding:6px 0;white-space:pre-wrap;">${escapeHtml(v)}</td></tr>`)
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5;">${trs}</table>`;
}

function detailsText(rows) {
  return rows
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function internal(subject, title, rows, replyTo) {
  const s = settings();
  sendLater({
    to: s.notifyTo,
    subject,
    replyTo,
    html: layout(title, `${detailsTable(rows)}<p style="margin-top:20px;font-size:13px;"><a href="${escapeHtml(s.siteUrl)}/admin" style="color:#EF4C20;">Open the admin console</a></p>`),
    text: `${title}\n\n${detailsText(rows)}\n\nAdmin: ${s.siteUrl}/admin`
  });
}

function clientConfirmation(to, subject, title, paragraphs, rows = []) {
  const s = settings();
  const html = paragraphs.map(p => `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;">${escapeHtml(p)}</p>`).join('')
    + (rows.length ? detailsTable(rows) : '')
    + `<p style="font-size:14px;line-height:1.6;margin-top:20px;">Warm regards,<br>THEWHY Consulting</p>`;
  sendLater({
    to,
    subject,
    replyTo: s.notifyTo,
    html: layout(title, html),
    text: `${paragraphs.join('\n\n')}\n\n${detailsText(rows)}\n\nWarm regards,\nTHEWHY Consulting`
  });
}

// ---------------------------------------------------------------------------
// Public notification helpers
// ---------------------------------------------------------------------------
function notifyNewBooking(b) {
  try {
    const rows = [
      ['Reference', b.ref_code], ['Client', b.clientName], ['Company', b.companyName], ['Email', b.email],
      ['Phone', b.phone], ['Service', b.service], ['Format', b.meetingType], ['Date', b.date],
      ['Time slot', b.timeSlot], ['Company size', b.companySize], ['Estimated fee', b.estimatedFee], ['Message', b.message]
    ];
    internal(`New consultation booking ${b.ref_code}: ${b.clientName}`, 'New consultation booking', rows, b.email);
    clientConfirmation(
      b.email,
      `Your THEWHY consultation request (${b.ref_code})`,
      'Consultation request received',
      [
        `Dear ${b.clientName},`,
        'Thank you for requesting an advisory session with THEWHY Consulting. A partner will review your request and contact you within 24 hours to confirm the schedule.',
        `Your reference code is ${b.ref_code}. Please quote it in any correspondence.`
      ],
      [['Reference', b.ref_code], ['Service', b.service], ['Format', b.meetingType], ['Requested date', b.date], ['Time slot', b.timeSlot]]
    );
  } catch (err) {
    console.error('[MAIL] notifyNewBooking error:', err.message);
  }
}

function notifyNewContact(c) {
  try {
    const rows = [
      ['Reference', c.ref_code], ['Name', c.name], ['Email', c.email], ['Phone', c.phone],
      ['Subject', c.subject], ['Message', c.message]
    ];
    internal(`New contact message: ${c.subject}`, 'New contact message', rows, c.email);
    clientConfirmation(
      c.email,
      'We received your message - THEWHY Consulting',
      'Message received',
      [
        `Dear ${c.name},`,
        'Thank you for contacting THEWHY Consulting. A consultant from our Lagos office will respond shortly.',
        `Reference: ${c.ref_code}`
      ]
    );
  } catch (err) {
    console.error('[MAIL] notifyNewContact error:', err.message);
  }
}

function notifyNewInquiry(inq) {
  try {
    const isApplication = /bootcamp|programme|program|launch/i.test(inq.serviceRequired || '');
    const kind = isApplication ? 'programme application' : 'inquiry';
    const rows = [
      ['Reference', inq.ref_code], ['Name', inq.name], ['Company', inq.company], ['Email', inq.email],
      ['Phone', inq.phone], ['Service / programme', inq.serviceRequired], ['Message', inq.message]
    ];
    internal(`New ${kind}: ${inq.name}`, `New ${kind}`, rows, inq.email);
    clientConfirmation(
      inq.email,
      isApplication ? 'Your THEWHY programme application' : 'Your inquiry - THEWHY Consulting',
      isApplication ? 'Application received' : 'Inquiry received',
      [
        `Dear ${inq.name},`,
        isApplication
          ? `Thank you for applying to ${inq.serviceRequired}. Our admissions panel will contact you with next steps.`
          : 'Thank you for your inquiry. A consultant will respond within 24 hours.',
        `Reference: ${inq.ref_code}`
      ]
    );
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
  send,
  sendLater,
  notifyNewBooking,
  notifyNewContact,
  notifyNewInquiry,
  _layout: layout,
  _detailsTable: detailsTable,
  _reset
};
