import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('logger service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
  });

  it('configures pretty transport in dev server environment', async () => {
    const child = { info: vi.fn() };
    const pinoInstance = { child: vi.fn().mockReturnValue(child) };
    const pinoMock = vi.fn().mockReturnValue(pinoInstance);

    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('LOG_LEVEL', '');
    vi.doMock('pino', () => ({ default: pinoMock }));

    const mod = await import('../../../src/services/logger');

    expect(pinoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'debug',
        transport: expect.objectContaining({ target: 'pino-pretty' }),
      }),
    );
    expect(mod.getLogger()).toBe(mod.default);
    expect(mod.getLogger('req-1')).toBe(child);
    expect(pinoInstance.child).toHaveBeenCalledWith({ requestId: 'req-1' });
  });

  it('omits transport in production/browser and honors LOG_LEVEL', async () => {
    const pinoInstance = { child: vi.fn() };
    const pinoMock = vi.fn().mockReturnValue(pinoInstance);

    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LOG_LEVEL', 'warn');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = {};
    vi.doMock('pino', () => ({ default: pinoMock }));

    await import('../../../src/services/logger');

    expect(pinoMock).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'warn', transport: undefined }),
    );
  });
});
