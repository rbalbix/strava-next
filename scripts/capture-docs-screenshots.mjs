#!/usr/bin/env node

/**
 * Gera as imagens da documentação (Readme.md e página /como-funciona)
 * capturando o app real com Playwright.
 *
 * Uso:
 *   yarn dev                     # em outro terminal (ou build + start)
 *   yarn docs:screenshots        # tudo
 *   yarn docs:screenshots site   # só public/images (página Como Funciona)
 *   yarn docs:screenshots readme  # só assets/readme (Readme.md)
 *
 * Como o painel é autenticado, o script injeta um cookie de sessão fictício
 * (`gl_session` — o GSSP só lê a presença dele) e intercepta as APIs de dados
 * com fixtures determinísticas (`DASHBOARD` / `THRESHOLDS` abaixo). Não há
 * chamada ao Strava, nem Redis, nem dado pessoal: todos os nomes e números
 * são fictícios.
 *
 * Saídas:
 *   public/images/*.png  → página "Como Funciona" (retrato, mobile, dark)
 *   assets/readme/*.png  → Readme.md (paisagem, desktop, dark)
 *
 * As imagens que NÃO são telas do app (strava-config, config-strava e
 * tela-inicio-*) continuam manuais e não são tocadas por este script.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// Cache local de navegadores do repo (mesma convenção dos runners de e2e).
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  const localBrowsersPath = path.resolve(root, '.playwright-browsers');
  if (fs.existsSync(localBrowsersPath)) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsersPath;
  }
}

const { chromium } = await import('playwright');

const baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
);

const OUT_SITE = path.join(root, 'public', 'images');
const OUT_README = path.join(root, 'assets', 'readme');

const target = (process.argv[2] || 'all').toLowerCase();
if (!['all', 'site', 'readme'].includes(target)) {
  console.error(`Uso: node scripts/capture-docs-screenshots.mjs [all|site|readme]`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Fixtures — dados fictícios para renderizar o painel sem Strava/Redis.
// ---------------------------------------------------------------------------

const THRESHOLDS = {
  g1001: {
    // 62,10 km / 70 km  → warning (amarela)
    lub: { value: 70, unit: 'km' },
    // 318,40 km / 500 km → normal (verde)
    chain: { value: 500, unit: 'km' },
    // 1.105,80 km / 1.000 km → overdue (vermelha) + dispara o modal de alerta
    tires: { value: 1000, unit: 'km' },
  },
  g1002: {
    // 208,54 km / 200 km → overdue (vermelha)
    lub: { value: 200, unit: 'km' },
    // 2.037,45 km / 2.000 km → overdue (vermelha)
    brakes: { value: 2000, unit: 'km' },
    // limite em HORAS: 26,5 h / 100 h → normal (verde)
    saddle: { value: 100, unit: 'h' },
  },
  g1003: {
    // 940,00 km / 2.000 km → normal (verde)
    tires: { value: 2000, unit: 'km' },
  },
};

const athlete = {
  id: 99000123,
  firstname: 'Ana',
  lastname: 'Ciclista',
  username: 'ana.ciclista',
  city: 'São Paulo',
  state: 'SP',
  country: 'Brazil',
  sex: 'F',
  premium: false,
  // Avatar local: evita rede externa durante a captura.
  profile: '/favicon.png',
  profile_medium: '/favicon.png',
  bikes: [
    { id: 'g1001', name: 'Chisel 22' },
    { id: 'g1002', name: 'SuperSix Evo' },
  ],
  shoes: [],
};

const totals = (count, distance, movingTime, elevationGain) => ({
  count,
  distance,
  moving_time: movingTime,
  elevation_gain: elevationGain,
});

const athleteStats = {
  biggest_ride_distance: 128_400,
  biggest_climb_elevation_gain: 1840,
  recent_ride_totals: totals(9, 286_400, 10_620, 3180),
  ytd_ride_totals: totals(148, 4_128_600, 148_200, 52_300),
  all_ride_totals: totals(1043, 28_460_500, 986_400, 341_200),
  recent_run_totals: totals(4, 38_200, 11_400, 210),
  ytd_run_totals: totals(36, 312_000, 92_400, 1820),
  all_run_totals: totals(210, 1_982_000, 589_200, 12_400),
};

const equipment = (id, caption, show, distance, movingTime, date) => ({
  id,
  caption,
  show,
  distance,
  movingTime,
  date,
  isRegistered: true,
});

const gearStats = [
  {
    id: 'g1001',
    name: 'Chisel 22',
    activityType: 'MountainBikeRide',
    count: 148,
    distance: 7_114_880,
    movingTime: 166_980,
    equipments: [
      equipment(
        'lub',
        'lubrificação:',
        'Lubrificação',
        62_100,
        15_480,
        '2026-11-14T09:00:00.000Z',
      ),
      equipment(
        'clean',
        'lavagem completa:',
        'Lavagem',
        142_000,
        35_400,
        '2026-11-05T09:00:00.000Z',
      ),
      equipment(
        'chain',
        'corrente:',
        'Corrente',
        318_400,
        78_600,
        '2026-10-18T09:00:00.000Z',
      ),
      equipment(
        'review',
        'revisão completa:',
        'Revisão',
        598_200,
        148_800,
        '2026-08-02T09:00:00.000Z',
      ),
      equipment(
        'tires',
        'pneus (par):',
        'Pneus (par)',
        1_105_800,
        267_000,
        '2026-05-20T09:00:00.000Z',
      ),
      equipment(
        'dropper',
        'canote:',
        'Canote (retrátil ou não)',
        1_148_300,
        279_000,
        '2026-04-02T09:00:00.000Z',
      ),
      equipment(
        'saddle',
        'selim:',
        'Selim',
        1_236_700,
        298_200,
        '2026-02-14T09:00:00.000Z',
      ),
      equipment(
        'helmet',
        'capacete:',
        'Capacete',
        1_342_900,
        322_800,
        '2025-12-05T09:00:00.000Z',
      ),
      equipment(
        'freehub',
        'freehub:',
        'Freehub',
        1_486_200,
        357_000,
        '2025-10-18T09:00:00.000Z',
      ),
      equipment(
        'headset',
        'direção:',
        'Rolamento de direção',
        1_612_400,
        388_800,
        '2025-08-09T09:00:00.000Z',
      ),
    ],
  },
  {
    id: 'g1002',
    name: 'SuperSix Evo',
    activityType: 'Ride',
    count: 322,
    distance: 12_480_500,
    movingTime: 402_300,
    equipments: [
      equipment(
        'lub',
        'lubrificação:',
        'Lubrificação',
        208_540,
        51_600,
        '2026-11-11T09:00:00.000Z',
      ),
      equipment(
        'brakes',
        'par de freios:',
        'Freios (par)',
        2_037_450,
        66_000,
        '2026-09-08T09:00:00.000Z',
      ),
      equipment(
        'saddle',
        'selim:',
        'Selim',
        1_864_200,
        95_400,
        '2026-06-15T09:00:00.000Z',
      ),
      equipment(
        'chain',
        'corrente:',
        'Corrente',
        986_300,
        322_800,
        '2026-03-27T09:00:00.000Z',
      ),
    ],
  },
  {
    id: 'g1003',
    name: 'Pyréneia - Scott',
    activityType: 'GravelRide',
    count: 64,
    distance: 3_120_400,
    movingTime: 112_800,
    equipments: [
      equipment(
        'lub',
        'lubrificação:',
        'Lubrificação',
        148_700,
        37_800,
        '2026-11-16T09:00:00.000Z',
      ),
      equipment(
        'tires',
        'pneus (par):',
        'Pneus (par)',
        940_000,
        228_600,
        '2026-04-11T09:00:00.000Z',
      ),
    ],
  },
];

const DASHBOARD = {
  athlete,
  athleteStats,
  hasGear: true,
  hasActivities: true,
  gearStats,
  equipmentThresholds: THRESHOLDS,
  // Sem casos não reconhecidos: o banner poluiria as capturas.
  unrecognizedCodes: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForServer(url, attempts = 90) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {
      // servidor ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `Servidor não respondeu em ${url}. Suba o app antes (yarn dev) ou aponte E2E_BASE_URL para outro endereço.`,
  );
}

/**
 * Contexto de captura: cookie de sessão fictício + mocks das APIs de dados.
 *
 * Fora do host do app tudo é cortado — analytics/fontes externas nunca entram
 * na imagem nem atrasam o render.
 */
async function createCaptureContext(browser, options) {
  const context = await browser.newContext({
    colorScheme: 'dark',
    serviceWorkers: 'block',
    ...options,
  });

  await context.addCookies([
    { name: 'gl_session', value: 'docs-screenshot-session', url: baseUrl },
  ]);

  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(`${baseUrl}/`) || url === baseUrl) {
      return route.continue();
    }
    return route.abort();
  });

  await context.route('**/api/app/dashboard', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DASHBOARD),
    }),
  );

  await context.route('**/api/app/equipment-thresholds', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ equipmentThresholds: THRESHOLDS }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ equipmentThresholds: THRESHOLDS }),
    });
  });

  return context;
}

async function screenshot(targetPath, write) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  await write(targetPath);
  const { size } = fs.statSync(targetPath);
  console.log(`  ✔ ${path.relative(root, targetPath)} (${Math.round(size / 1024)} KB)`);
}

/**
 * Bounding box de um seletor, com padding e recorte dentro da viewport.
 * Usado para o Readme não exibir telas cheias de espaço vazio.
 */
async function clipBox(page, selector, pad = 24) {
  const box = await page
    .locator(selector)
    .first()
    .boundingBox()
    .catch(() => null);
  if (!box) return null;

  const viewport = page.viewportSize() || { width: 1440, height: 900 };
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const right = Math.min(viewport.width, box.x + box.width + pad);
  const bottom = Math.min(viewport.height, box.y + box.height + pad);

  return { x, y, width: right - x, height: bottom - y };
}

function modal(page, label) {
  // O sidebar também é role=dialog; ele é identificado por aria-label.
  // A modal do app é a que carrega aria-labelledby (modal-title-*).
  return label
    ? page.locator(`[role="dialog"][aria-labelledby="${label}"]`)
    : page.locator('[role="dialog"][aria-labelledby]');
}

/**
 * Esconde o indicador de dev do Next 15 (badge "N" no canto inferior).
 * Em produção o portal nem existe — o style é inofensivo lá.
 */
async function hideDevIndicator(page) {
  await page
    .addStyleTag({ content: 'nextjs-portal{display:none!important}' })
    .catch(() => {});
}

async function openSidebar(page) {
  await page.getByRole('button', { name: 'Abrir menu lateral' }).first().click();
  await page.locator('#sidebar-menu').waitFor({ state: 'visible' });
}

async function closeWithEscape(page, locator) {
  await page.keyboard.press('Escape');
  await locator.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Capturas mobile → public/images (página "Como Funciona")
// ---------------------------------------------------------------------------

async function captureSiteImages(browser) {
  console.log('\n📱 Capturas mobile → public/images');

  // 0. Landing pública (Passo 1) — sem sessão.
  const publicContext = await browser.newContext({
    colorScheme: 'dark',
    serviceWorkers: 'block',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  await publicContext.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(`${baseUrl}/`) || url === baseUrl) {
      return route.continue();
    }
    return route.abort();
  });
  const publicPage = await publicContext.newPage();
  await publicPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await hideDevIndicator(publicPage);
  await publicPage
    .locator('h1', { hasText: 'Pedale. A gente cuida da manutenção.' })
    .waitFor({ state: 'visible', timeout: 30000 });
  await publicPage.waitForTimeout(400);
  await screenshot(path.join(OUT_SITE, 'login.png'), (p) =>
    publicPage.screenshot({ path: p }),
  );
  await publicContext.close();

  const context = await createCaptureContext(browser, {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await hideDevIndicator(page);
  await page
    .locator('button[aria-label="Abrir detalhes de Chisel 22"]')
    .waitFor({ state: 'visible', timeout: 30000 });

  // 1. Modal de alerta de limites (abre sozinho na primeira carga com
  //    itens overdue — é o "Passo: Limites" da página).
  const alertModal = modal(page, 'modal-title-threshold-alert');
  await alertModal.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(300);
  await screenshot(path.join(OUT_SITE, 'threshold-screen.png'), (p) =>
    page.screenshot({ path: p }),
  );
  await closeWithEscape(page, alertModal);

  // 2. Lista de equipamentos (Passo 2).
  await page.waitForTimeout(300);
  await screenshot(path.join(OUT_SITE, 'equipments.png'), (p) =>
    page.screenshot({ path: p }),
  );

  // 3. Detalhe do equipamento (Passo 3).
  await page.getByRole('button', { name: 'Abrir detalhes de Chisel 22' }).click();
  const detail = modal(page, 'modal-title-card-detail');
  await detail.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
  await screenshot(path.join(OUT_SITE, 'components.png'), (p) =>
    page.screenshot({ path: p }),
  );

  // 4. Barras de progresso (normal/warning/overdue) — mesma modal; rolagem
  //    interna do `.modalContent` (overflow-y: auto) até a primeira barra.
  const bars = detail.locator('[role="progressbar"]');
  await bars.first().evaluate((el) => {
    const container = el.closest('[role="dialog"]');
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    container.scrollTop += elRect.top - cRect.top - 90;
  });
  await page.waitForTimeout(250);
  await screenshot(path.join(OUT_SITE, 'threshold-progress-bar.png'), (p) =>
    page.screenshot({ path: p }),
  );

  // 5. Editor de limite (Passo de Limites, item 2).
  await detail
    .locator('li', { hasText: 'corrente:' })
    .getByRole('button')
    .first()
    .click();
  const editor = detail.locator('input[aria-label="Limite de corrente:"]');
  await editor.waitFor({ state: 'visible', timeout: 5000 });
  await editor.evaluate((el) => {
    const container = el.closest('[role="dialog"]');
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    container.scrollTop += elRect.top - cRect.top - 260;
  });
  await page.waitForTimeout(250);
  await screenshot(path.join(OUT_SITE, 'threshold-editor.png'), (p) =>
    page.screenshot({ path: p }),
  );
  await closeWithEscape(page, detail);

  // 6. Modal "Componentes" — lista de códigos (Passo 4).
  await openSidebar(page);
  await page.getByRole('button', { name: 'Componentes' }).click();
  const components = modal(page, 'modal-title-equipments');
  await components.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
  await screenshot(path.join(OUT_SITE, 'component-list.png'), (p) =>
    components.screenshot({ path: p }),
  );

  await context.close();
}

// ---------------------------------------------------------------------------
// Capturas desktop → assets/readme (Readme.md)
// ---------------------------------------------------------------------------

async function captureReadmeImages(browser) {
  console.log('\n🖥️  Capturas desktop → assets/readme');

  // 1. Landing pública (sem sessão) — seção "Login / entrada".
  const publicContext = await browser.newContext({
    colorScheme: 'dark',
    serviceWorkers: 'block',
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  await publicContext.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(`${baseUrl}/`) || url === baseUrl) {
      return route.continue();
    }
    return route.abort();
  });
  const publicPage = await publicContext.newPage();
  await publicPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await hideDevIndicator(publicPage);
  await publicPage
    .locator('h1', { hasText: 'Pedale. A gente cuida da manutenção.' })
    .waitFor({ state: 'visible', timeout: 30000 });
  await publicPage.waitForTimeout(400);
  const landingClip = await clipBox(publicPage, '[class*="homeText"]', 48);
  await screenshot(path.join(OUT_README, 'landing.png'), (p) =>
    publicPage.screenshot({ path: p, ...(landingClip ? { clip: landingClip } : {}) }),
  );
  await publicContext.close();

  // 2. Painel autenticado + modais.
  const context = await createCaptureContext(browser, {
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await hideDevIndicator(page);
  await page
    .locator('button[aria-label="Abrir detalhes de Chisel 22"]')
    .waitFor({ state: 'visible', timeout: 30000 });

  const alertModal = modal(page, 'modal-title-threshold-alert');
  await alertModal.waitFor({ state: 'visible', timeout: 15000 });
  await closeWithEscape(page, alertModal);
  await page.waitForTimeout(300);

  // Lista de equipamentos (recorte da coluna do painel — sem espaço vazio).
  const dashboardClip = await clipBox(
    page,
    '[class*="statsContainer"] main',
    16,
  );
  await screenshot(path.join(OUT_README, 'dashboard.png'), (p) =>
    page.screenshot({ path: p, ...(dashboardClip ? { clip: dashboardClip } : {}) }),
  );

  // Estatísticas gerais.
  await openSidebar(page);
  await page.getByRole('button', { name: 'Estatísticas' }).click();
  const stats = modal(page, 'modal-title-stats');
  await stats.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
  await screenshot(path.join(OUT_README, 'statistics.png'), (p) =>
    stats.screenshot({ path: p }),
  );
  await closeWithEscape(page, stats);

  // Detalhe do equipamento.
  await page.getByRole('button', { name: 'Abrir detalhes de Chisel 22' }).click();
  const detail = modal(page, 'modal-title-card-detail');
  await detail.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
  await screenshot(path.join(OUT_README, 'equipment-detail.png'), (p) =>
    detail.screenshot({ path: p }),
  );
  await closeWithEscape(page, detail);

  // Lista de códigos dos componentes.
  await openSidebar(page);
  await page.getByRole('button', { name: 'Componentes' }).click();
  const components = modal(page, 'modal-title-equipments');
  await components.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
  await screenshot(path.join(OUT_README, 'components-codes.png'), (p) =>
    components.screenshot({ path: p }),
  );

  await context.close();
}

// ---------------------------------------------------------------------------

try {
  console.log(`Verificando servidor em ${baseUrl} ...`);
  await waitForServer(baseUrl);

  const browser = await chromium.launch({ headless: true });
  try {
    if (target === 'all' || target === 'site') {
      await captureSiteImages(browser);
    }
    if (target === 'all' || target === 'readme') {
      await captureReadmeImages(browser);
    }
  } finally {
    await browser.close();
  }

  console.log('\n✅ Capturas concluídas.');
} catch (error) {
  console.error('\n❌ Falha nas capturas:', error.message);
  process.exitCode = 1;
}
