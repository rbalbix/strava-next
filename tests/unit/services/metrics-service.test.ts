import { beforeEach, describe, expect, it, vi } from 'vitest';

type LoadOptions = {
  hgetallImpl?: ReturnType<typeof vi.fn>;
  hincrbyImpl?: ReturnType<typeof vi.fn>;
};

async function loadMetricsModule(options: LoadOptions = {}) {
  vi.resetModules();

  const redis = {
    hgetall: options.hgetallImpl ?? vi.fn().mockResolvedValue(null),
    hincrby: options.hincrbyImpl ?? vi.fn().mockResolvedValue(1),
  };

  vi.doMock('../../../src/services/redis', () => ({
    default: redis,
  }));

  const mod = await import('../../../src/services/metrics');
  return { ...mod, redis };
}

describe('metrics service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as any).window;
  });

  it('increments in-memory counters and persists increments', async () => {
    const { webhookEvents, redis } = await loadMetricsModule();
    const labels = { object_type: 'activity', aspect_type: 'create' };
    const normalized = { aspect_type: 'create', object_type: 'activity' };

    webhookEvents.inc(labels);
    webhookEvents.inc(labels);

    expect(webhookEvents.getValue(normalized)).toBe(2);
    expect(redis.hincrby).toHaveBeenCalledTimes(2);
  });

  it('register.metrics renders persisted values when available', async () => {
    const hgetallImpl = vi.fn().mockImplementation((key: string) => {
      if (key === 'metrics:counter:webhook_events_total') {
        return Promise.resolve({
          '{"aspect_type":"create","object_type":"activity"}': '7',
        });
      }
      return Promise.resolve(null);
    });

    const { register } = await loadMetricsModule({ hgetallImpl });
    const output = await register.metrics();

    expect(output).toContain('# HELP webhook_events_total');
    expect(output).toContain(
      'webhook_events_total{aspect_type="create",object_type="activity"} 7',
    );
  });

  it('falls back to in-memory values when persistence read fails', async () => {
    const { register, emailSent } = await loadMetricsModule({
      hgetallImpl: vi.fn().mockRejectedValue(new Error('redis down')),
    });

    emailSent.inc();
    const output = await register.metrics();

    expect(output).toContain('email_sent_total 1');
  });

  it('handles invalid persisted label key and still renders metric', async () => {
    const hgetallImpl = vi.fn().mockImplementation((key: string) => {
      if (key === 'metrics:counter:webhook_events_total') {
        return Promise.resolve({
          '{invalid-json': '3',
        });
      }
      return Promise.resolve(null);
    });

    const { register } = await loadMetricsModule({ hgetallImpl });
    const output = await register.metrics();

    expect(output).toContain('webhook_events_total 3');
  });

  it('swallows persistence increment errors', async () => {
    const { webhookValidationFailed, redis } = await loadMetricsModule({
      hincrbyImpl: vi.fn().mockRejectedValue(new Error('redis down')),
    });

    webhookValidationFailed.inc();
    expect(webhookValidationFailed.getValue()).toBe(1);
    await Promise.resolve();
    expect(redis.hincrby).toHaveBeenCalledTimes(1);
  });

  it('counter increment is a no-op in browser context', async () => {
    const { activityProcessed } = await loadMetricsModule();
    (globalThis as any).window = {};

    activityProcessed.inc();

    expect(activityProcessed.getValue()).toBe(0);
    delete (globalThis as any).window;
  });

  it('registry metrics is empty in browser context', async () => {
    const { register } = await loadMetricsModule();
    (globalThis as any).window = {};
    await expect(register.metrics()).resolves.toBe('');
    delete (globalThis as any).window;
  });

  it('counter exposes name and all entries', async () => {
    const { tokenRefreshAttempts } = await loadMetricsModule();
    tokenRefreshAttempts.inc();
    expect(tokenRefreshAttempts.getName()).toBe('token_refresh_attempts_total');
    expect(tokenRefreshAttempts.getAll().length).toBeGreaterThan(0);
  });

  it('exports prometheus content type', async () => {
    const { register } = await loadMetricsModule();
    expect(register.contentType).toBe('text/plain; version=0.0.4; charset=utf-8');
  });
});
