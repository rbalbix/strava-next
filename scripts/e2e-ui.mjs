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

  // A home pública agora renderiza a landing em vez de redirecionar ao Strava.
  // O redirect condicional era o motivo de o E2E passar num fluxo que o usuário
  // real nunca via: a home pública era inalcançável.
  //
  // A landing não tem mais <h1> de marca nem os links das páginas públicas
  // (§8.11 — decisões do proprietário): o texto de destaque é a tagline e o
  // "Como funciona" abre o modal informativo em vez de navegar.
  await expectVisible(
    page,
    'h2:text("Pedale. A gente cuida da manutenção.")',
    'Landing tagline not found.',
  );
  await expectVisible(
    page,
    'a[href="/api/oauth/start"]',
    'Primary "Entrar com Strava" CTA not found on home.',
  );

  // Open and close info modal with real user interactions.
  // O CTA "Como funciona" da landing abre o modal informativo; o menu lateral
  // deslogado chama o mesmo modal de "Ajuda".
  await expectVisible(
    page,
    'button:text("Como funciona")',
    '"Como funciona" CTA not found on home.',
  );
  await page.getByRole('button', { name: 'Como funciona' }).click();
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

  // Navigate through public pages. A landing não as linka mais, então a
  // entrada é por URL direta; a navegação entre elas segue pelo nav que cada
  // página pública ainda exibe.
  await page.goto(`${baseUrl}/como-funciona`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });
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
  await expectVisible(
    page,
    'h2:text("Pedale. A gente cuida da manutenção.")',
    'Failed to return to home.',
  );

  // ---------------------------------------------------------------------
  // Critério de aceite do A2/A3 (§2.D.9 do plano de usabilidade): "um erro
  // transitório no dashboard não dispara round-trip ao Strava — nenhuma
  // chamada a /api/oauth/start sem clique".
  //
  // Antes, `signOut()` limpava a sessão e o `router.replace('/')` voltava a
  // bater no OAuth do Strava, que reemittia o token silenciosamente. Com
  // falha persistente (429) isso se repetia para sempre, porque o quota é por
  // atleta e não por sessão.
  //
  // Roda num contexto isolado, com o service worker bloqueado, para que nada
  // cacheie a página nem intercepte as chamadas da rede.
  // ---------------------------------------------------------------------
  const errorContext = await browser.newContext({ serviceWorkers: 'block' });

  // Cookie de sessão opaco. Só importa que `getServerSideProps` o enxergue e
  // renderize o painel — o valor em si é irrelevante, porque a chamada que o
  // valida é justamente a que vai falhar.
  await errorContext.addCookies([
    { name: 'strava_code', value: 'e2e-opaque-session', url: baseUrl },
    { name: 'strava_athleteId', value: '4242', url: baseUrl },
  ]);

  await errorContext.route('**/api/app/dashboard', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Rate limited' }),
    }),
  );

  const errorPage = await errorContext.newPage();

  const forbiddenRequests = [];
  errorPage.on('request', (request) => {
    const url = request.url();
    if (
      url.includes('/api/oauth/start') ||
      url.includes('/api/app/logout') ||
      url.includes('strava.com')
    ) {
      forbiddenRequests.push(url);
    }
  });

  await errorPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await errorPage
    .locator('text=Limite excedido')
    .waitFor({ state: 'visible', timeout: 10000 });

  // Janela para qualquer round-trip assíncrono se manifestar.
  await errorPage.waitForTimeout(1500);

  if (forbiddenRequests.length > 0) {
    throw new Error(
      `A transient dashboard error triggered a re-authentication round-trip: ${forbiddenRequests.join(', ')}`,
    );
  }

  if (!errorPage.url().startsWith(baseUrl)) {
    throw new Error(
      `Expected to stay inside the app after a transient error, but navigated to: ${errorPage.url()}`,
    );
  }

  await errorContext.close();

  // ---------------------------------------------------------------------
  // Regressão do §8.6 — o caso reportado em teste manual.
  //
  // Quando o PRIMEIRO carregamento não encontra sessão no servidor (a chave
  // `strava:auth:<id>` foi apagada do Redis, expirou ou o cookie é antigo), a
  // API responde 401 — e não 500. Não existe sessão ativa a recuperar: o
  // cliente encerra os cookies e volta para a landing com o ícone de login,
  // sem redirecionar sozinho ao Strava e sem texto de "Sessão expirada".
  //
  // Antes, o servidor respondia 500 para tudo, o cliente tratava como falha
  // transitória e o usuário ficava preso num painel de erro com retries que
  // nunca resolviam — não havia sessão nenhuma para recuperar.
  //
  // É o espelho exato do teste acima: ali um 429 NÃO pode deslogar, aqui um
  // 401 sem sessão viva DEVE deslogar — e sem passar pelo Strava.
  // ---------------------------------------------------------------------
  const expiredContext = await browser.newContext({
    serviceWorkers: 'block',
  });

  await expiredContext.addCookies([
    { name: 'strava_code', value: 'e2e-opaque-session', url: baseUrl },
    { name: 'strava_athleteId', value: '4242', url: baseUrl },
  ]);

  await expiredContext.route('**/api/app/dashboard', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Unauthorized',
        reason: 'Session expired or invalid',
      }),
    }),
  );

  const expiredPage = await expiredContext.newPage();

  const reauthRequests = [];
  let logoutCalled = false;
  expiredPage.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/oauth/start') || url.includes('strava.com')) {
      reauthRequests.push(url);
    }
    if (url.includes('/api/app/logout')) {
      logoutCalled = true;
    }
  });

  await expiredPage.goto(baseUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });

  // A landing precisa aparecer sozinha, sem clique nenhum. O discriminador é
  // a tagline: o painel de erro do 401 também exibe um CTA de login
  // (`ErroMsg`), então o link sozinho não prova nada.
  await expiredPage.waitForSelector('text=Pedale. A gente cuida da manutenção.', {
    state: 'visible',
    timeout: 15000,
  });

  const expiredMessageVisible = await expiredPage
    .getByText('Sessão expirada', { exact: false })
    .isVisible()
    .catch(() => false);
  if (expiredMessageVisible) {
    throw new Error(
      'A landing exibiu "Sessão expirada" para um visitante sem sessão no Redis.',
    );
  }

  // Janela para qualquer round-trip assíncrono se manifestar.
  await expiredPage.waitForTimeout(1500);

  if (reauthRequests.length > 0) {
    throw new Error(
      `Encerrar a sessão por 401 foi reautenticar no Strava em vez de pousar na landing: ${reauthRequests.join(', ')}`,
    );
  }

  if (!logoutCalled) {
    throw new Error(
      'Um 401 não limpou os cookies de sessão: o próximo carregamento repetiria o mesmo erro para sempre.',
    );
  }

  await expiredContext.close();

  console.log('E2E UI passed.');
} finally {
  await browser.close();
}
