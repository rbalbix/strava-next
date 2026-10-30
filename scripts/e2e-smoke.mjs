import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // A home pública agora renderiza a landing em vez de empurrar o visitante
  // direto para o Strava (D6 / PR 1 do plano de usabilidade).
  //
  // Este smoke vigiava exatamente o defeito: ele passava mesmo quando o
  // usuário real nunca via a landing, o valor do produto nem o aviso de
  // privacidade. Um redirect para o OAuth volta a ser falha.
  const url = page.url();
  if (url.includes('strava.com') || url.includes('/api/oauth/start')) {
    throw new Error(
      `Expected the public landing, but was redirected to: ${url}`,
    );
  }

  // A landing não tem mais <h1> de marca (§8.11); o texto de destaque é a
  // tagline. O que precisa existir é ela — prova de que a landing renderizou
  // de verdade — e o CTA de login.
  const tagline = page.locator('h2', {
    hasText: 'Pedale. A gente cuida da manutenção.',
  });
  if ((await tagline.count()) === 0) {
    throw new Error('Landing tagline not found.');
  }

  const cta = page.locator('a[href="/api/oauth/start"]');
  if ((await cta.count()) === 0) {
    throw new Error(
      '"Entrar com Strava" CTA not found on the landing (the user must be able to choose to enter).',
    );
  }

  console.log('E2E smoke passed: public landing rendered without redirect.');
} finally {
  await browser.close();
}
