const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const { csvCell, toCsv, makeRefCode, escapeHtml, slugify } = require('../server/lib/util');
const { validate, schemas } = require('../server/lib/validate');

test('csvCell neutralises formula prefixes and quotes properly', () => {
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell('+1'), '"\'+1"');
  assert.equal(csvCell('-1'), '"\'-1"');
  assert.equal(csvCell('@SUM(A1)'), '"\'@SUM(A1)"');
  assert.equal(csvCell('\tcmd'), '"\'\tcmd"');
  assert.equal(csvCell('\rcmd'), '"\'\rcmd"');
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(42), '"42"');
  assert.equal(csvCell('+234 803'), '"\'+234 803"');
  assert.equal(toCsv(['a', 'b'], [['1', '=2']]), '"a","b"\r\n"1","\'=2"\r\n');
});

test('reference codes have at least 8 random characters', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const ref = makeRefCode('WHY');
    assert.match(ref, /^WHY-\d{4}-[A-Z2-9]{10}$/);
    seen.add(ref);
  }
  assert.equal(seen.size, 200);
});

test('escapeHtml and slugify', () => {
  assert.equal(escapeHtml('<a href="x">\'&'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
  assert.equal(slugify('<script>alert(1)</script> Café Tips'), 'script-alert-1-script-cafe-tips');
});

test('validator: email, phone, lengths, unknown keys, trimming', () => {
  const ok = validate({ name: '  Ada  ', email: 'ADA@Example.com ', message: 'hi', phone: '(0803) 000-0000' }, schemas.contact);
  assert.equal(ok.ok, true);
  assert.equal(ok.value.name, 'Ada');
  assert.equal(ok.value.email, 'ada@example.com');

  for (const phone of ['123', 'abc1234567', '+'.repeat(21), '1234567890123456789012']) {
    assert.equal(validate({ name: 'A', email: 'a@b.co', message: 'm', phone }, schemas.contact).ok, false, phone);
  }
  for (const email of ['a@b', 'a b@c.com', '<x>@y.com', 'plain']) {
    assert.equal(validate({ name: 'A', email, message: 'm' }, schemas.contact).ok, false, email);
  }
  assert.equal(validate({ name: 'A', email: 'a@b.co', message: 'm', extra: 1 }, schemas.contact).ok, false);
  assert.equal(validate({ name: 'A'.repeat(121), email: 'a@b.co', message: 'm' }, schemas.contact).ok, false);
  assert.equal(validate({ name: ['A'], email: 'a@b.co', message: 'm' }, schemas.contact).ok, false);
  assert.equal(validate({ status: 'confirmed' }, schemas.bookingUpdate, { partial: true }).value.status, 'CONFIRMED');
  assert.equal(validate({ status: 'nope' }, schemas.bookingUpdate, { partial: true }).ok, false);
});

test('session tokens: valid, expired and tampered', () => {
  process.env.ADMIN_PASSCODE = 'unit-test-passcode-123';
  process.env.ADMIN_SESSION_SECRET = 'x'.repeat(40);
  process.env.NODE_ENV = 'test';
  const auth = require('../server/lib/auth');
  auth.initAuth();
  assert.equal(auth.verifyPasscode('unit-test-passcode-123'), true);
  assert.equal(auth.verifyPasscode('unit-test-passcode-12'), false);
  assert.equal(auth.verifyPasscode(''), false);
  assert.equal(auth.verifyPasscode(undefined), false);

  const now = Date.now();
  const token = auth.createSessionToken(now);
  assert.ok(auth.verifySessionToken(token, now + 1000));
  assert.equal(auth.verifySessionToken(token, now + auth.SESSION_TTL_MS + 1), null);
  assert.equal(auth.verifySessionToken(`${token}x`), null);
  assert.equal(auth.verifySessionToken('true'), null);

  // Rotating the passcode invalidates existing sessions.
  process.env.ADMIN_PASSCODE = 'a-different-passcode-456';
  auth.initAuth();
  assert.equal(auth.verifySessionToken(token, now + 1000), null);
});

function runServerWith(env) {
  // cwd = tmpdir so dotenv does not pick up the project's .env file.
  return spawnSync(process.execPath, [path.join(__dirname, '..', 'server', 'server.js')], {
    cwd: os.tmpdir(),
    env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, DB_MODE: 'json', PORT: '0', ...env },
    encoding: 'utf8',
    timeout: 15000
  });
}

test('production refuses to start without a safe ADMIN_PASSCODE / secret', () => {
  const secret = 's'.repeat(40);
  const unset = runServerWith({ NODE_ENV: 'production', ADMIN_PASSCODE: '', ADMIN_SESSION_SECRET: secret });
  assert.equal(unset.status, 1);
  assert.match(unset.stderr, /ADMIN_PASSCODE is not set/);

  const legacy = runServerWith({ NODE_ENV: 'production', ADMIN_PASSCODE: 'whyng2026', ADMIN_SESSION_SECRET: secret });
  assert.equal(legacy.status, 1);
  assert.match(legacy.stderr, /published default/);

  const noSecret = runServerWith({ NODE_ENV: 'production', ADMIN_PASSCODE: 'a-long-random-passcode', ADMIN_SESSION_SECRET: '' });
  assert.equal(noSecret.status, 1);
  assert.match(noSecret.stderr, /ADMIN_SESSION_SECRET/);
});

test('development generates and prints a temporary passcode when unset', () => {
  const auth = require('../server/lib/auth');
  const lines = [];
  const logger = { warn: (m) => lines.push(m) };
  const saved = { p: process.env.ADMIN_PASSCODE, e: process.env.NODE_ENV };
  process.env.ADMIN_PASSCODE = '';
  process.env.NODE_ENV = 'development';
  try {
    const result = auth.initAuth({ logger });
    assert.equal(result.generatedPasscode, true);
    const line = lines.find(l => l.includes('Generated a temporary admin passcode'));
    assert.ok(line);
    const generated = line.split(': ').pop().trim();
    assert.ok(generated.length >= 12);
    assert.equal(auth.verifyPasscode(generated), true);
  } finally {
    process.env.ADMIN_PASSCODE = saved.p;
    process.env.NODE_ENV = saved.e;
  }
});

test('mailer is a silent no-op without SMTP and escapes user HTML', async () => {
  process.env.SMTP_HOST = '';
  const mailer = require('../server/services/mailer');
  mailer._reset();
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    const r1 = await mailer.send({ to: 'a@b.co', subject: 's', html: 'h' });
    const r2 = await mailer.send({ to: 'a@b.co', subject: 's', html: 'h' });
    assert.deepEqual(r1, { skipped: true });
    assert.deepEqual(r2, { skipped: true });
  } finally {
    console.log = orig;
  }
  assert.equal(logs.filter(l => l.includes('[MAIL] SMTP not configured, skipping')).length, 1);

  const html = mailer._detailsTable([['Name', '<script>x</script>'], ['Empty', '']]);
  assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('Empty'));
  // Notification helpers never throw, even without SMTP.
  mailer.notifyNewBooking({ ref_code: 'WHY-1', clientName: '<b>', email: 'a@b.co' });
});
