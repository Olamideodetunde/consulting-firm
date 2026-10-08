const { test, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, init, login, cleanup } = require('./helpers');
const cloudinary = require('../server/services/cloudinary');
const mailer = require('../server/services/mailer');

before(init);
after(cleanup);

const CLOUD_KEYS = ['CLOUDINARY_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_FOLDER'];
afterEach(() => { CLOUD_KEYS.forEach((k) => { process.env[k] = ''; }); });

function configure() {
  process.env.CLOUDINARY_URL = 'cloudinary://123456789012345:test-secret@demo-cloud';
}

test('tests never talk to real email or image services, whatever .env holds', () => {
  assert.equal(process.env.BREVO_API_KEY, '');
  assert.equal(mailer.provider(), null);
  assert.equal(cloudinary.isConfigured(), false);
});

test('signature matches Cloudinary\'s documented example', () => {
  // https://cloudinary.com/documentation/authentication_signatures
  const sig = cloudinary.sign(
    { eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 },
    'abcd'
  );
  assert.equal(sig, 'bfd09f95f331f558cbd1320e67aa8d488770583e');
});

test('config parses CLOUDINARY_URL and discrete variables', () => {
  configure();
  assert.deepEqual(
    { ...cloudinary.config() },
    { cloudName: 'demo-cloud', apiKey: '123456789012345', apiSecret: 'test-secret', folder: 'whyng/insights' }
  );
  process.env.CLOUDINARY_URL = '';
  process.env.CLOUDINARY_CLOUD_NAME = 'other';
  process.env.CLOUDINARY_API_KEY = 'k';
  process.env.CLOUDINARY_API_SECRET = 's';
  process.env.CLOUDINARY_FOLDER = '/custom/folder/';
  assert.equal(cloudinary.config().cloudName, 'other');
  assert.equal(cloudinary.config().folder, 'custom/folder');
});

test('optimizedUrl adds auto format/quality only for this account', () => {
  configure();
  const raw = 'https://res.cloudinary.com/demo-cloud/image/upload/v1700000000/whyng/insights/cover.jpg';
  assert.equal(
    cloudinary.optimizedUrl(raw),
    'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_1600/v1700000000/whyng/insights/cover.jpg'
  );
  assert.equal(cloudinary.optimizedUrl(cloudinary.optimizedUrl(raw)), cloudinary.optimizedUrl(raw), 'idempotent');
  const foreign = 'https://res.cloudinary.com/someone-else/image/upload/v1/x.jpg';
  assert.equal(cloudinary.optimizedUrl(foreign), foreign);
});

test('upload routes require an admin session', async () => {
  for (const [method, url] of [['get', '/api/admin/uploads/config'], ['post', '/api/admin/uploads/sign'], ['get', '/api/admin/uploads']]) {
    const res = await request(app)[method](url);
    assert.equal(res.status, 401, `${method.toUpperCase()} ${url}`);
  }
});

test('when Cloudinary is not configured the admin gets a clear message, not a crash', async () => {
  const cookie = await login();
  const cfg = await request(app).get('/api/admin/uploads/config').set('Cookie', cookie);
  assert.equal(cfg.status, 200);
  assert.equal(cfg.body.data.enabled, false);
  assert.equal(cfg.body.data.cloudName, null);

  const sign = await request(app).post('/api/admin/uploads/sign').set('Cookie', cookie).send({});
  assert.equal(sign.status, 503);
  assert.match(sign.body.error, /not configured/i);

  const list = await request(app).get('/api/admin/uploads').set('Cookie', cookie);
  assert.equal(list.status, 200);
  assert.equal(list.body.enabled, false);
});

test('sign returns a valid signature and never leaks the API secret', async () => {
  configure();
  const cookie = await login();
  const res = await request(app).post('/api/admin/uploads/sign').set('Cookie', cookie).send({});
  assert.equal(res.status, 200);
  assert.equal(res.headers['cache-control'], 'no-store');
  const d = res.body.data;
  assert.equal(d.cloudName, 'demo-cloud');
  assert.equal(d.apiKey, '123456789012345');
  assert.equal(d.uploadUrl, 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
  assert.equal(d.folder, 'whyng/insights');
  assert.equal(d.allowed_formats, 'jpg,jpeg,png,webp,avif');
  assert.ok(Math.abs(d.timestamp - Date.now() / 1000) < 60);
  assert.equal(
    d.signature,
    cloudinary.sign({ timestamp: d.timestamp, folder: d.folder, allowed_formats: d.allowed_formats }, 'test-secret')
  );
  assert.ok(!JSON.stringify(res.body).includes('test-secret'), 'secret must never be sent to the browser');
});

test('listing uploads maps Cloudinary resources to optimised URLs', async () => {
  configure();
  const cookie = await login();
  const saved = global.fetch;
  let calledWith = null;
  global.fetch = async (url, opts) => {
    calledWith = { url: String(url), auth: opts.headers.Authorization };
    return {
      ok: true,
      json: async () => ({
        resources: [
          { public_id: 'whyng/insights/older', format: 'png', secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v1/whyng/insights/older.png', width: 800, height: 450, bytes: 1000, created_at: '2026-01-01T00:00:00Z' },
          { public_id: 'whyng/insights/newer', format: 'jpg', secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v2/whyng/insights/newer.jpg', width: 1600, height: 900, bytes: 2000, created_at: '2026-02-01T00:00:00Z' }
        ]
      })
    };
  };
  try {
    const res = await request(app).get('/api/admin/uploads').set('Cookie', cookie);
    assert.equal(res.status, 200);
    assert.match(calledWith.url, /\/v1_1\/demo-cloud\/resources\/image\?/);
    assert.match(calledWith.url, /prefix=whyng%2Finsights%2F/);
    assert.equal(calledWith.auth, `Basic ${Buffer.from('123456789012345:test-secret').toString('base64')}`);
    assert.equal(res.body.data[0].name, 'newer.jpg', 'newest first');
    assert.match(res.body.data[0].path, /\/upload\/f_auto,q_auto,c_limit,w_1600\/v2\//);
    assert.match(res.body.data[0].thumb, /w_400/);
  } finally {
    global.fetch = saved;
  }
});

test('an uploaded Cloudinary URL is accepted as an article cover and used for social previews', async () => {
  configure();
  const cookie = await login();
  const cover = 'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_limit,w_1600/v1/whyng/insights/cover.jpg';
  const created = await request(app).post('/api/insights').set('Cookie', cookie).send({
    title: 'Cloudinary Cover Test',
    excerpt: 'Testing covers',
    content: 'Body text',
    cover_image: cover,
    is_published: true
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const slug = created.body.data.slug;
  const page = await request(app).get(`/insights/${slug}`);
  assert.equal(page.status, 200);
  assert.ok(page.text.includes(`<meta property="og:image" content="${cover}"`));

  const bad = await request(app).post('/api/insights').set('Cookie', cookie).send({
    title: 'Bad cover', content: 'x', cover_image: 'javascript:alert(1)'
  });
  assert.equal(bad.status, 400);
});
