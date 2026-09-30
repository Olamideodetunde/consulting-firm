const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { app, request, init, login, cleanup, DB_JSON_PATH, validBooking } = require('./helpers');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let cookie;
before(async () => {
  await init();
  cookie = await login();
});
after(cleanup);

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
test('public booking POST with valid data returns 201 with UUID id and long ref_code', async () => {
  const res = await request(app).post('/api/bookings').send(validBooking());
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.match(res.body.data.id, UUID_RE);
  assert.match(res.body.data.ref_code, /^WHY-\d{4}-[A-Z2-9]{10}$/);
  assert.equal(res.body.data.status, 'PENDING');
  assert.equal(res.body.data.clientName, 'Adebayo Ogunlesi');
});

test('booking accepts the booking-wizard payload shape (empty optional fields)', async () => {
  const res = await request(app).post('/api/bookings').send({
    service: 'Accounting & Tax Services',
    meetingType: 'Virtual (Google Meet)',
    date: '',
    timeSlot: '10:00 AM - 10:45 AM',
    clientName: '  Ngozi Eze  ',
    companyName: '',
    email: 'NGOZI@Example.COM',
    phone: '08030000000',
    companySize: 'Small Business (10-50 staff)',
    message: '',
    estimatedFee: 'Standard Consultation'
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.clientName, 'Ngozi Eze');
  assert.equal(res.body.data.email, 'ngozi@example.com');
  assert.match(res.body.data.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('booking with invalid email returns 400 JSON error', async () => {
  const res = await request(app).post('/api/bookings').send({ ...validBooking(), email: 'not-an-email' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.error, /email/i);
});

test('booking validation: missing, oversized, unknown and malformed fields are rejected', async () => {
  const cases = [
    { ...validBooking(), clientName: '' },
    { ...validBooking(), phone: 'call me maybe' },
    { ...validBooking(), phone: '12' },
    { ...validBooking(), clientName: 'x'.repeat(121) },
    { ...validBooking(), message: 'x'.repeat(5001) },
    { ...validBooking(), date: '2026-13-45' },
    { ...validBooking(), isAdmin: true },
    { ...validBooking(), clientName: { $gt: '' } }
  ];
  for (const body of cases) {
    const res = await request(app).post('/api/bookings').send(body);
    assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(body).slice(0, 80)}`);
    assert.equal(res.body.success, false);
  }
});

test('oversized request bodies are rejected with 413', async () => {
  const res = await request(app).post('/api/contact').send({ name: 'A', email: 'a@b.co', message: 'x'.repeat(25 * 1024) });
  assert.equal(res.status, 413);
});

test('calendar invite is served for a booking UUID', async () => {
  const created = await request(app).post('/api/bookings').send(validBooking());
  const res = await request(app).get(`/api/bookings/${created.body.data.id}/calendar.ics`);
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/calendar/);
  assert.match(res.text, /BEGIN:VCALENDAR/);
  assert.match(res.text, new RegExp(created.body.data.ref_code));
});

test('admin can filter, update (whitelisted status) and delete bookings', async () => {
  const created = await request(app).post('/api/bookings').send({ ...validBooking(), clientName: 'Status Test Client' });
  const id = created.body.data.id;

  const search = await request(app).get('/api/bookings?search=Status%20Test').set('Cookie', cookie);
  assert.equal(search.status, 200);
  assert.ok(search.body.data.some(b => b.id === id));

  const bad = await request(app).patch(`/api/bookings/${id}`).set('Cookie', cookie).send({ status: 'HACKED' });
  assert.equal(bad.status, 400);

  const ok = await request(app).patch(`/api/bookings/${id}`).set('Cookie', cookie).send({ status: 'confirmed', notes: 'Call booked' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.status, 'CONFIRMED');
  assert.equal(ok.body.data.notes, 'Call booked');

  const filtered = await request(app).get('/api/bookings?status=CONFIRMED').set('Cookie', cookie);
  assert.ok(filtered.body.data.every(b => b.status === 'CONFIRMED'));

  const del = await request(app).delete(`/api/bookings/${id}`).set('Cookie', cookie);
  assert.equal(del.status, 200);
  const gone = await request(app).get(`/api/bookings/${id}`).set('Cookie', cookie);
  assert.equal(gone.status, 404);
});

test('CSV export escapes formula-injection payloads and quotes cells', async () => {
  await request(app).post('/api/bookings').send({
    ...validBooking(),
    clientName: '=HYPERLINK("http://evil.example","click")',
    companyName: '+SUM(1,2)',
    message: '@cmd, "quoted"\nnew line'
  });
  const res = await request(app).get('/api/stats/export/bookings.csv').set('Cookie', cookie);
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/csv/);
  assert.ok(res.text.includes('"\'=HYPERLINK(""http://evil.example"",""click"")"'), 'formula cell not neutralised');
  assert.ok(res.text.includes('"\'+SUM(1,2)"'));
  assert.ok(res.text.includes('"\'@cmd, ""quoted""\nnew line"'));
  assert.ok(!/(^|,)=HYPERLINK/m.test(res.text), 'raw formula leaked');
});

// ---------------------------------------------------------------------------
// Contact messages
// ---------------------------------------------------------------------------
test('contact POST returns ref_code; admin can mark responded and delete', async () => {
  const res = await request(app).post('/api/contact').send({
    name: 'Chioma Obi', email: 'chioma@example.com', phone: '', subject: 'Audit', message: 'Please call me.'
  });
  assert.equal(res.status, 201);
  assert.match(res.body.ref_code, /^CTX-\d{4}-[A-Z2-9]{10}$/);
  const id = res.body.data.id;
  assert.match(id, UUID_RE);

  const missing = await request(app).post('/api/contact').send({ name: 'X', email: 'x@example.com' });
  assert.equal(missing.status, 400);

  const list = await request(app).get('/api/contact').set('Cookie', cookie);
  assert.ok(list.body.data.some(c => c.id === id));

  const badStatus = await request(app).patch(`/api/contact/${id}`).set('Cookie', cookie).send({ status: 'pwned' });
  assert.equal(badStatus.status, 400);
  const responded = await request(app).patch(`/api/contact/${id}`).set('Cookie', cookie).send({ status: 'responded' });
  assert.equal(responded.status, 200);
  assert.equal(responded.body.data.status, 'responded');

  const del = await request(app).delete(`/api/contact/${id}`).set('Cookie', cookie);
  assert.equal(del.status, 200);
});

// ---------------------------------------------------------------------------
// Inquiries (launch form sends `company`)
// ---------------------------------------------------------------------------
test('inquiry POST persists company; status whitelist enforced', async () => {
  const res = await request(app).post('/api/inquiries').send({
    name: 'Tunde Bakare',
    company: 'Bakare Foods Ltd',
    email: 'tunde@example.com',
    phone: '+2348030000000',
    serviceRequired: 'SME Executive Bootcamp (CMD Accredited)',
    message: 'Role: CEO | Challenge: Scale & Tax Governance'
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.company, 'Bakare Foods Ltd');
  assert.match(res.body.data.ref_code, /^INQ-\d{4}-[A-Z2-9]{10}$/);
  const id = res.body.data.id;

  const list = await request(app).get('/api/inquiries').set('Cookie', cookie);
  const stored = list.body.data.find(i => i.id === id);
  assert.equal(stored.company, 'Bakare Foods Ltd');

  const bad = await request(app).patch(`/api/inquiries/${id}/status`).set('Cookie', cookie).send({ status: 'DROP TABLE' });
  assert.equal(bad.status, 400);
  const ok = await request(app).patch(`/api/inquiries/${id}/status`).set('Cookie', cookie).send({ status: 'CONTACTED' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.status, 'CONTACTED');
  const del = await request(app).delete(`/api/inquiries/${id}`).set('Cookie', cookie);
  assert.equal(del.status, 200);
});

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------
test('newsletter stores subscribers, deduplicated, visible to admin', async () => {
  const a = await request(app).post('/api/newsletter').send({ email: 'Reader@Example.com' });
  assert.equal(a.status, 200);
  assert.equal(a.body.success, true);
  const b = await request(app).post('/api/stats/newsletter').send({ email: 'reader@example.com' });
  assert.equal(b.status, 200);
  const bad = await request(app).post('/api/newsletter').send({ email: 'nope' });
  assert.equal(bad.status, 400);

  const list = await request(app).get('/api/admin/newsletter').set('Cookie', cookie);
  assert.equal(list.status, 200);
  const matches = list.body.data.filter(s => s.email === 'reader@example.com');
  assert.equal(matches.length, 1);

  const del = await request(app).delete(`/api/admin/newsletter/${matches[0].id}`).set('Cookie', cookie);
  assert.equal(del.status, 200);
});

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------
test('XSS-ish article title is stored as-is but rendered escaped in server-side meta tags', async () => {
  const title = '<script>alert("xss")</script> Tax "Tips" & Tricks';
  const created = await request(app).post('/api/insights').set('Cookie', cookie).send({
    title,
    category: 'Tax & Fiscal Policy',
    excerpt: 'An <img src=x onerror=alert(1)> excerpt',
    content: 'Body text',
    is_published: true
  });
  assert.equal(created.status, 201);
  const slug = created.body.data.slug;
  assert.match(slug, /^[a-z0-9-]+$/);

  const api = await request(app).get(`/api/insights/${slug}`);
  assert.equal(api.status, 200);
  assert.equal(api.body.data.title, title);

  const listed = await request(app).get('/api/insights');
  assert.ok(listed.body.data.some(a => a.slug === slug), 'admin-created article missing from public list');

  const page = await request(app).get(`/insights/${slug}`);
  assert.equal(page.status, 200);
  assert.ok(!page.text.includes('<script>alert("xss")</script>'), 'raw script tag rendered');
  assert.ok(!page.text.includes('<img src=x onerror'), 'raw img tag rendered');
  assert.ok(page.text.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; Tax &quot;Tips&quot; &amp; Tricks'));
});

test('draft articles are hidden from the public but visible to admins', async () => {
  const created = await request(app).post('/api/insights').set('Cookie', cookie).send({
    title: 'Unreleased Draft', content: 'Secret body', is_published: false
  });
  assert.equal(created.status, 201);
  const slug = created.body.data.slug;

  assert.equal((await request(app).get(`/api/insights/${slug}`)).status, 404);
  assert.equal((await request(app).get(`/insights/${slug}`)).status, 404);
  const pub = await request(app).get('/api/insights');
  assert.ok(!pub.body.data.some(a => a.slug === slug));

  const adminList = await request(app).get('/api/admin/insights').set('Cookie', cookie);
  assert.ok(adminList.body.data.some(a => a.slug === slug));
  assert.equal((await request(app).get(`/api/insights/${slug}`).set('Cookie', cookie)).status, 200);

  const upd = await request(app).put(`/api/insights/${slug}`).set('Cookie', cookie).send({ is_published: true });
  assert.equal(upd.status, 200);
  assert.equal((await request(app).get(`/api/insights/${slug}`)).status, 200);

  const del = await request(app).delete(`/api/insights/${slug}`).set('Cookie', cookie);
  assert.equal(del.status, 200);
});

test('article validation rejects unknown fields and bad cover image URLs', async () => {
  const r1 = await request(app).post('/api/insights').set('Cookie', cookie).send({ title: 'T', content: 'C', slug: 'x' });
  assert.equal(r1.status, 400);
  const r2 = await request(app).post('/api/insights').set('Cookie', cookie)
    .send({ title: 'T', content: 'C', cover_image: 'javascript:alert(1)' });
  assert.equal(r2.status, 400);
});

// ---------------------------------------------------------------------------
// Persistence & public content
// ---------------------------------------------------------------------------
test('writes go to the configured temp JSON store, not the repository', async () => {
  assert.ok(fs.existsSync(DB_JSON_PATH));
  const data = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
  assert.ok(data.bookings.length > 0);
  assert.equal('adminPasscode' in data.siteSettings, false);
  const tmpLeftovers = fs.readdirSync(path.dirname(DB_JSON_PATH)).filter(f => f.endsWith('.tmp'));
  assert.deepEqual(tmpLeftovers, []);
});

test('public content APIs respond', async () => {
  const services = await request(app).get('/api/services');
  assert.ok(services.body.data.length >= 10);
  const industries = await request(app).get('/api/industries');
  assert.ok(industries.body.data.length >= 6);
  const team = await request(app).get('/api/team');
  assert.ok(team.body.data.length >= 3);
  const launch = await request(app).get('/api/launch');
  assert.ok(launch.body.data.title);
  const cs = await request(app).get('/api/case-studies');
  assert.ok(cs.body.data.length > 0);
  const faqs = await request(app).get('/api/faqs');
  assert.ok(faqs.body.data.length > 0);
  const insights = await request(app).get('/api/insights');
  assert.ok(insights.body.data.length >= 4);
  const unknown = await request(app).get('/api/does-not-exist');
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.success, false);
});

test('calculator API is gone', async () => {
  const res = await request(app).post('/api/calculator/estimate').send({});
  assert.equal(res.status, 404);
});
