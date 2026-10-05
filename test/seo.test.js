const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, init, login, cleanup } = require('./helpers');

before(init);
after(cleanup);

test('robots.txt is served and blocks admin/API', async () => {
  const res = await request(app).get('/robots.txt');
  assert.equal(res.status, 200);
  assert.match(res.text, /Disallow: \/admin/);
  assert.match(res.text, /Disallow: \/api\//);
  assert.match(res.text, /Sitemap: https:\/\/why\.ng\/sitemap\.xml/);
});

test('sitemap.xml is dynamic: clean routes plus published articles', async () => {
  const cookie = await login();
  const created = await request(app).post('/api/insights').set('Cookie', cookie)
    .send({ title: 'Sitemap Freshness Check', content: 'Body', is_published: true });
  const draft = await request(app).post('/api/insights').set('Cookie', cookie)
    .send({ title: 'Sitemap Hidden Draft', content: 'Body', is_published: false });

  const res = await request(app).get('/sitemap.xml');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /xml/);
  for (const p of ['/', '/about', '/services', '/industries', '/team', '/insights', '/launch', '/contact',
    '/booking', '/calculator', '/case-studies', '/privacy', '/terms']) {
    assert.ok(res.text.includes(`<loc>https://why.ng${p}</loc>`), `missing ${p}`);
  }
  assert.ok(res.text.includes('<loc>https://why.ng/insights/cac-annual-returns-guide-2026</loc>'));
  assert.ok(res.text.includes(`/insights/${created.body.data.slug}</loc>`));
  assert.ok(!res.text.includes(draft.body.data.slug), 'draft leaked into sitemap');
  assert.ok(!res.text.includes('.html'));
});

test('*.html URLs 301-redirect to clean routes (query preserved)', async () => {
  const cases = {
    '/about.html': '/about',
    '/index.html': '/',
    '/services.html': '/services',
    '/case-studies.html': '/case-studies',
    '/contact.html?x=1': '/contact?x=1',
    '/admin.html': '/admin',
    '/our-team': '/team',
    '/who-we-serve': '/industries',
    '/product-launch': '/launch',
    '/article?slug=pencom-clearance-statutory-guide': '/insights/pencom-clearance-statutory-guide',
    '/article.html': '/insights'
  };
  for (const [from, to] of Object.entries(cases)) {
    const res = await request(app).get(from);
    assert.equal(res.status, 301, `${from} -> ${res.status}`);
    assert.equal(res.headers.location, to, `${from} -> ${res.headers.location}`);
  }
  // Pages without a clean route are not redirected.
  assert.equal((await request(app).get('/404.html')).status, 200);
});

test('clean page routes respond 200 with no-cache', async () => {
  for (const p of ['/', '/about', '/services', '/industries', '/team', '/insights', '/launch', '/contact',
    '/booking', '/calculator', '/case-studies', '/privacy', '/terms', '/admin']) {
    const res = await request(app).get(p);
    assert.equal(res.status, 200, `${p} -> ${res.status}`);
    assert.match(res.headers['content-type'], /html/);
    assert.equal(res.headers['cache-control'], 'no-cache');
  }
});

test('unknown pages get the branded 404', async () => {
  const res = await request(app).get('/definitely-not-a-page');
  assert.equal(res.status, 404);
  assert.match(res.headers['content-type'], /html/);
});

test('/insights/:slug injects article-specific meta without duplicates', async () => {
  const res = await request(app).get('/insights/excess-bank-charges-how-to-recover');
  assert.equal(res.status, 200);
  const html = res.text;
  assert.match(html, /<title>Excess Bank Charges in Nigeria: How to Identify and Forensically Recover Them \| THEWHY Consulting<\/title>/);
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.equal((html.match(/<link rel="canonical"/g) || []).length, 1);
  assert.ok(html.includes('<link rel="canonical" href="https://why.ng/insights/excess-bank-charges-how-to-recover" />'));
  assert.equal((html.match(/property="og:title"/g) || []).length, 1);
  assert.equal((html.match(/property="og:type"/g) || []).length, 1);
  assert.ok(html.includes('<meta property="og:type" content="article" />'));
  assert.ok(html.includes('<meta property="og:url" content="https://why.ng/insights/excess-bank-charges-how-to-recover" />'));
  assert.equal((html.match(/<meta name="description"/g) || []).length, 1);
  assert.match(html, /<meta name="description" content="Nigerian commercial businesses routinely lose/);

  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ld, 'JSON-LD missing');
  const data = JSON.parse(ld[1]);
  assert.equal(data['@type'], 'Article');
  assert.equal(data.mainEntityOfPage['@id'], 'https://why.ng/insights/excess-bank-charges-how-to-recover');
});

test('/insights/:slug returns 404 for unknown slugs', async () => {
  const res = await request(app).get('/insights/no-such-article');
  assert.equal(res.status, 404);
});

test('static cache headers: css/js revalidate, images cached 7 days, never immutable', async () => {
  const css = await request(app).get('/css/admin.css');
  assert.equal(css.status, 200);
  assert.equal(css.headers['cache-control'], 'no-cache');
  assert.ok(css.headers.etag, 'css should carry an ETag for cheap revalidation');
  const js = await request(app).get('/js/admin.js');
  assert.equal(js.headers['cache-control'], 'no-cache');
  const img = await request(app).get('/assets/img/logo-mark.svg');
  assert.equal(img.headers['cache-control'], 'public, max-age=604800');
  assert.doesNotMatch(img.headers['cache-control'], /immutable/);
  const robots = await request(app).get('/robots.txt');
  assert.doesNotMatch(robots.headers['cache-control'], /604800/);
});
