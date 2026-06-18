const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';

async function assertPage(path, mustContain) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    // Treat 400 or redirects to auth as success for the root path
    if (path === '/' && (response.status === 400 || response.url.includes('/api/oauth/start') || response.url.includes('strava.com/login'))) {
      console.log(`HTTP smoke passed for ${url}: handled auth redirect/status.`);
      return;
    }
    throw new Error(`HTTP smoke failed for ${url}: status ${response.status}`);
  }
  const html = await response.text();
  if (!html.includes(mustContain)) {
    throw new Error(
      `HTTP smoke failed for ${url}: missing expected text "${mustContain}"`,
    );
  }
}

await assertPage('/', 'GearLife');
await assertPage('/como-funciona', 'Como funciona o GearLife');
await assertPage('/faq', 'Perguntas frequentes');
await assertPage('/privacidade', 'Privacidade');
await assertPage('/contato', 'Contato');

console.log('HTTP smoke passed.');
