const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, init, login, cleanup, TEST_PASSCODE } = require('./helpers');
const { PUBLIC_SETTINGS_KEYS } = require('../server/lib/validate');

before(init);
after(cleanup);

const PROTECTED = [
  ['get', '/api/admin/content'],
  ['get', '/api/admin/settings'],
  ['put', '/api/admin/settings'],
  ['put', '/api/admin/launch'],
  ['get', '/api/admin/media'],
  ['get', '/api/admin/insights'],
  ['get', '/api/admin/newsletter'],
  ['get', '/api/stats'],
  ['get', '/api/stats/export/bookings.csv'],
  ['get', '/api/bookings'],
  ['get', '/api/bookings/some-id'],
  ['patch', '/api/bookings/some-id'],
  ['delete', '/api/bookings/some-id'],
  ['get', '/api/contact'],
  ['patch', '/api/contact/some-id'],
  ['delete', '/api/contact/some-id'],
  ['get', '/api/inquiries'],
  ['patch', '/api/inquiries/some-id/status'],
  ['delete', '/api/inquiries/some-id'],
  ['post', '/api/insights'],
  ['put', '/api/insights/cac-annual-returns-guide-2026'],
  ['delete', '/api/insights/cac-annual-returns-guide-2026']
];

test('GET /api/settings never exposes adminPasscode and only returns allowlisted keys', async () => {
  const res = await request(app).get('/api/settings');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal('adminPasscode' in res.body.data, false);
  assert.ok(!JSON.stringify(res.body).includes('whyng2026'));
  assert.ok(!JSON.stringify(res.body).includes(TEST_PASSCODE));
  for (const key of Object.keys(res.body.data)) assert.ok(PUBLIC_SETTINGS_KEYS.includes(key), `unexpected key ${key}`);
  assert.ok(res.body.data.phone);
});

test('seed data contains no admin passcode', () => {
  const seed = require('../server/db/seedData');
  assert.equal('adminPasscode' in seed.siteSettings, false);
});

test('protected routes return 401 without a session cookie', async () => {
  for (const [method, url] of PROTECTED) {
    const res = await request(app)[method](url).send({});
    assert.equal(res.status, 401, `${method.toUpperCase()} ${url} returned ${res.status}`);
  }
});

test('GET /api/admin/session is 401 when signed out', async () => {
  const res = await request(app).get('/api/admin/session');
  assert.equal(res.status, 401);
  assert.equal(res.body.authenticated, false);
});

test('verify with the wrong passcode returns 401 and sets no cookie', async () => {
  const res = await request(app).post('/api/admin/verify').send({ passcode: 'definitely-wrong' });
  assert.equal(res.status, 401);
  assert.equal(res.headers['set-cookie'], undefined);
});

test('the legacy default passcode no longer works', async () => {
  const res = await request(app).post('/api/admin/verify').send({ passcode: 'whyng2026' });
  assert.equal(res.status, 401);
});

test('verify with the right passcode sets a hardened cookie that unlocks protected routes', async () => {
  const res = await request(app).post('/api/admin/verify').send({ passcode: TEST_PASSCODE });
  assert.equal(res.status, 200);
  const cookie = (res.headers['set-cookie'] || []).find(c => c.startsWith('whyng_admin='));
  assert.ok(cookie, 'session cookie missing');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.match(cookie, /Path=\//);
  assert.doesNotMatch(cookie, /Secure/i, 'Secure is only set in production');
  const cookieHeader = cookie.split(';')[0];

  const session = await request(app).get('/api/admin/session').set('Cookie', cookieHeader);
  assert.equal(session.status, 200);
  assert.equal(session.body.authenticated, true);

  for (const url of ['/api/bookings', '/api/contact', '/api/inquiries', '/api/stats', '/api/admin/content',
    '/api/admin/settings', '/api/admin/insights', '/api/admin/newsletter', '/api/stats/export/bookings.csv']) {
    const r = await request(app).get(url).set('Cookie', cookieHeader);
    assert.equal(r.status, 200, `GET ${url} returned ${r.status}`);
  }
});

test('a tampered session cookie is rejected', async () => {
  const cookie = await login();
  const [name, value] = cookie.split('=');
  const [body, sig] = decodeURIComponent(value).split('.');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  payload.exp += 1000 * 60 * 60 * 24 * 365;
  const forgedBody = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const res = await request(app).get('/api/stats').set('Cookie', `${name}=${forgedBody}.${sig}`);
  assert.equal(res.status, 401);
  const res2 = await request(app).get('/api/stats').set('Cookie', 'whyng_admin=true');
  assert.equal(res2.status, 401);
});

test('logout clears the cookie and revokes the token', async () => {
  const cookie = await login();
  const out = await request(app).post('/api/admin/logout').set('Cookie', cookie);
  assert.equal(out.status, 200);
  const cleared = (out.headers['set-cookie'] || []).find(c => c.startsWith('whyng_admin='));
  assert.ok(cleared && /Expires=Thu, 01 Jan 1970/i.test(cleared), 'cookie not cleared');
  const after = await request(app).get('/api/stats').set('Cookie', cookie);
  assert.equal(after.status, 401);
});

test('PUT /api/admin/settings only accepts allowlisted keys', async () => {
  const cookie = await login();
  const bad = await request(app).put('/api/admin/settings').set('Cookie', cookie)
    .send({ announcement: 'Hello', adminPasscode: 'hacked' });
  assert.equal(bad.status, 400);

  const good = await request(app).put('/api/admin/settings').set('Cookie', cookie)
    .send({ announcement: 'New cohort opens soon' });
  assert.equal(good.status, 200);
  const pub = await request(app).get('/api/settings');
  assert.equal(pub.body.data.announcement, 'New cohort opens soon');
  assert.equal('adminPasscode' in pub.body.data, false);

  const launchBad = await request(app).put('/api/admin/launch').set('Cookie', cookie).send({ evil: 'x' });
  assert.equal(launchBad.status, 400);
});

test('security headers: CSP allowlist, noindex on admin and API', async () => {
  const home = await request(app).get('/');
  const csp = home.headers['content-security-policy'];
  assert.ok(csp, 'CSP header missing');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self' 'unsafe-inline' https:\/\/cdnjs\.cloudflare\.com/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-src https:\/\/www\.openstreetmap\.org/);
  assert.match(csp, /form-action 'self'/);
  assert.equal(home.headers['x-robots-tag'], undefined);

  const api = await request(app).get('/api/health');
  assert.equal(api.headers['x-robots-tag'], 'noindex, nofollow');
  const admin = await request(app).get('/admin');
  assert.equal(admin.status, 200);
  assert.equal(admin.headers['x-robots-tag'], 'noindex, nofollow');
  assert.match(admin.text, /<meta name="robots" content="noindex,nofollow">/);
  assert.doesNotMatch(admin.text, /cdn\.tailwindcss\.com/);
});

test('CORS: allowlisted origins get headers, others do not', async () => {
  const ok = await request(app).get('/api/health').set('Origin', 'https://why.ng');
  assert.equal(ok.headers['access-control-allow-origin'], 'https://why.ng');
  const evil = await request(app).get('/api/health').set('Origin', 'https://evil.example');
  assert.equal(evil.headers['access-control-allow-origin'], undefined);
});
