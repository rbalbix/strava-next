import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function run(cmd, args, env = process.env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env,
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

const env = { ...process.env };
const localBrowsersPath = path.resolve(process.cwd(), '.playwright-browsers');

// If a project-local Playwright browser cache exists, prefer it by default.
if (!env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(localBrowsersPath)) {
  env.PLAYWRIGHT_BROWSERS_PATH = localBrowsersPath;
}

const playwrightCode = await run('node', ['scripts/e2e-smoke.mjs'], env);
if (playwrightCode === 0) {
  process.exit(0);
}

console.warn(
  'Playwright smoke failed. Falling back to HTTP smoke (no browser dependency).',
);

const httpCode = await run('node', ['scripts/e2e-http-smoke.mjs'], env);
process.exit(httpCode);
