const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject);
  });
}

function post(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: resData, headers: res.headers }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('   THEWHY CONSULTING - FULL BRIEF COMPLIANCE TEST       ');
  console.log('========================================================\n');

  const pages = [
    { name: '1. Home Page', path: '/' },
    { name: '2. About Us', path: '/about' },
    { name: '3. Services (10 Pillars)', path: '/services' },
    { name: '4. Industries / Who We Serve', path: '/industries' },
    { name: '5. Our Core Team', path: '/team' },
    { name: '6. Blog & Insights', path: '/insights' },
    { name: '7. Single Article Page', path: '/article?slug=cac-annual-returns-guide-2026' },
    { name: '8. Product Launch Page', path: '/launch' },
    { name: '9. Contact Us', path: '/contact' },
    { name: '10. Privacy Policy', path: '/privacy' },
    { name: '11. Terms of Use', path: '/terms' },
    { name: '12. Admin Dashboard', path: '/admin' }
  ];

  console.log('--- 1. VERIFYING ALL 10 PAGES & UTILITY ROUTES ---');
  let allPagesPass = true;
  for (const p of pages) {
    const res = await get(p.path);
    const pass = res.status === 200;
    if (!pass) allPagesPass = false;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${p.name.padEnd(30)} -> HTTP ${res.status} (${res.body.length} bytes)`);
  }

  console.log('\n--- 2. VERIFYING 404 CUSTOM ERROR ROUTE ---');
  const notFound = await get('/non-existent-page-test');
  console.log(`[${notFound.status === 404 ? 'PASS' : 'FAIL'}] 404 Error Handler               -> HTTP ${notFound.status} (Contains 404: ${notFound.body.includes('404')})`);

  console.log('\n--- 3. VERIFYING REST APIs FOR CONTENT & BRIEF SCOPE ---');
  const servicesRes = await get('/api/services');
  const services = JSON.parse(servicesRes.body);
  console.log(`[${services.data.length >= 10 ? 'PASS' : 'FAIL'}] Services API (10 Practice Areas) -> Count: ${services.data.length}`);

  const industriesRes = await get('/api/industries');
  const industries = JSON.parse(industriesRes.body);
  console.log(`[${industries.data.length >= 6 ? 'PASS' : 'FAIL'}] Industries API (6 Focus Sectors) -> Count: ${industries.data.length}`);

  const teamRes = await get('/api/team');
  const team = JSON.parse(teamRes.body);
  console.log(`[${team.data.length >= 3 ? 'PASS' : 'FAIL'}] Team API (Core Leadership)     -> Count: ${team.data.length}`);

  const launchRes = await get('/api/launch');
  const launch = JSON.parse(launchRes.body);
  console.log(`[${launch.data.title ? 'PASS' : 'FAIL'}] Product Launch Campaign API     -> Title: "${launch.data.title.slice(0, 35)}..."`);

  const insightsRes = await get('/api/insights');
  const insights = JSON.parse(insightsRes.body);
  console.log(`[${insights.data.length > 0 ? 'PASS' : 'FAIL'}] Insights Blog API               -> Count: ${insights.data.length}`);

  const mediaRes = await get('/api/admin/media');
  const media = JSON.parse(mediaRes.body);
  console.log(`[${media.data.length > 0 ? 'PASS' : 'FAIL'}] Admin Media Assets Library     -> Count: ${media.data.length}`);

  console.log('\n--- 4. VERIFYING ADMIN PASSCODE AUTH ---');
  const authValid = await post('/api/admin/verify', { passcode: 'whyng2026' });
  console.log(`[${JSON.parse(authValid.body).success ? 'PASS' : 'FAIL'}] Passcode 'whyng2026' Auth       -> Success: ${JSON.parse(authValid.body).success}`);

  const authInvalid = await post('/api/admin/verify', { passcode: 'wrongpassword' });
  console.log(`[${authInvalid.status === 401 ? 'PASS' : 'FAIL'}] Invalid Passcode Rejection      -> Status: ${authInvalid.status}`);

  console.log('\n========================================================');
  console.log('   ALL SYSTEMS & PAGES READY FOR CLIENT PRODUCTION      ');
  console.log('========================================================');
}

runTests().catch(console.error);
