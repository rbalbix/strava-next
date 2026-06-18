import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Now redirects to OAuth start or directly to Strava login
  const url = page.url();
  if (!url.includes('/api/oauth/start') && !url.includes('strava.com/login')) {
    throw new Error(`Expected redirection to /api/oauth/start or strava.com/login, got: ${url}`);
  }

  console.log('E2E smoke passed: redirected to OAuth flow.');
} finally {
  await browser.close();
}
