import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';

async function expectVisible(page, selector, message) {
  const count = await page.locator(selector).count();
  if (count === 0) {
    throw new Error(message);
  }
}

async function expectHeading(page, name, message) {
  const heading = page.getByRole('heading', { name });
  await heading.waitFor({ state: 'visible', timeout: 10000 });
  const count = await heading.count();
  if (count === 0) {
    throw new Error(message);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Public home
  await expectVisible(page, 'h1:text("GearLife")', 'Home heading not found.');
  await expectVisible(
    page,
    '[aria-label="Abrir informações"]',
    'Info button not found on home header.',
  );

  // Open and close info modal with real user interactions
  await page.getByLabel('Abrir informações').click();
  await expectVisible(
    page,
    'text=Como usar o aplicativo para monitorar equipamentos',
    'Info modal content did not open.',
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const stillVisible = await page
    .locator('text=Como usar o aplicativo para monitorar equipamentos')
    .count();
  if (stillVisible !== 0) {
    throw new Error('Info modal did not close after pressing Escape.');
  }

  // Navigate through public pages using clickable links
  await page.getByRole('link', { name: 'Como funciona' }).first().click();
  await page.waitForURL('**/como-funciona', { timeout: 10000 });
  await expectHeading(
    page,
    /Como funciona o GearLife/i,
    'Como funciona page heading not found.',
  );

  await page.getByRole('link', { name: 'FAQ' }).first().click();
  await page.waitForURL('**/faq', { timeout: 10000 });
  await expectHeading(
    page,
    /Perguntas frequentes/i,
    'FAQ page heading not found.',
  );

  await page.getByRole('link', { name: 'Contato' }).first().click();
  await page.waitForURL('**/contato', { timeout: 10000 });
  await expectHeading(page, /Contato/i, 'Contato page heading not found.');
  await expectVisible(
    page,
    'a[href^="mailto:"]',
    'Contact mailto link not found.',
  );

  // Return to home via public nav
  await page.getByRole('link', { name: 'Início' }).first().click();
  await page.waitForFunction(() => window.location.pathname === '/', {
    timeout: 10000,
  });
  await expectHeading(page, /GearLife/i, 'Failed to return to home.');

  console.log('E2E UI passed.');
} finally {
  await browser.close();
}
