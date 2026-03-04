import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadRedisModule(nodeEnv: string | undefined) {
  vi.resetModules();

  if (nodeEnv === undefined) {
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
  } else {
    (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv;
  }

  const fromEnv = vi.fn().mockReturnValue({ client: 'redis' });
  vi.doMock('@upstash/redis', () => ({
    Redis: {
      fromEnv,
    },
  }));

  const mod = await import('../../../src/services/redis');
  return { redis: mod.default, fromEnv };
}

describe('redis service bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__redis = undefined;
  });

  it('uses Redis.fromEnv directly in production', async () => {
    const { redis, fromEnv } = await loadRedisModule('production');

    expect(fromEnv).toHaveBeenCalledTimes(1);
    expect(redis).toEqual({ client: 'redis' });
  });

  it('reuses global redis instance in non-production', async () => {
    const first = await loadRedisModule('development');
    expect(first.fromEnv).toHaveBeenCalledTimes(1);
    expect((globalThis as any).__redis).toEqual({ client: 'redis' });

    const second = await loadRedisModule('development');
    expect(second.fromEnv).not.toHaveBeenCalled();
    expect(second.redis).toEqual({ client: 'redis' });
  });
});
