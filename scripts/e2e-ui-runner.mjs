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

if (!env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(localBrowsersPath)) {
  env.PLAYWRIGHT_BROWSERS_PATH = localBrowsersPath;
}

const code = await run('node', ['scripts/e2e-ui.mjs'], env);
if (code !== 0) {
  console.warn(
    'UI E2E failed. Ensure browser binaries are installed: yarn playwright install chromium',
  );
}
process.exit(code);
