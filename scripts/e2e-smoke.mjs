import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

  const title = await page.textContent('h1');
  if (!title || !title.includes('GearLife')) {
    throw new Error(`Expected page to contain GearLife heading, got: ${title}`);
  }

  await page.getByRole('link', { name: 'Como funciona' }).first().click();
  await page.waitForURL('**/como-funciona', { timeout: 10000 });

  await page
    .getByRole('heading', { name: /Como funciona o GearLife/i })
    .waitFor({ state: 'visible', timeout: 10000 });

  console.log('E2E smoke passed.');
} finally {
  await browser.close();
}
