import { spawn } from 'node:child_process';

const port = process.env.PORT || '3000';
const baseUrl = process.env.E2E_BASE_URL || `http://127.0.0.1:${port}`;
const startupTimeoutMs = 60_000;
const pollIntervalMs = 1_000;

function run(cmd, args, env = process.env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env,
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (response.ok) return;
    } catch (_) {
      // Server still starting up.
    }

    await delay(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for app to become ready at ${url}`);
}

const env = {
  ...process.env,
  PORT: port,
  E2E_BASE_URL: baseUrl,
};

const server = spawn('yarn', ['start'], {
  stdio: 'inherit',
  env,
});

let exitCode = 1;

try {
  await waitForServer(baseUrl, startupTimeoutMs);
  exitCode = await run('node', ['scripts/e2e-smoke-runner.mjs'], env);
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => server.once('close', resolve));
}

process.exit(exitCode);
