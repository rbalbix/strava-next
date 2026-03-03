import { describe, expect, it, vi } from 'vitest';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

type LoadOptions = {
  method?: string;
  isAuthorized?: boolean;
  metricsBody?: string;
  metricsThrows?: boolean;
  contentType?: string;
};

async function loadMetricsHandler(options: LoadOptions = {}) {
  vi.resetModules();

  const hasValidInternalApiKey = vi
    .fn()
    .mockReturnValue(options.isAuthorized ?? true);
  const logger = {
    warn: vi.fn(),
    error: vi.fn(),
  };
  const metrics = options.metricsThrows
    ? vi.fn().mockRejectedValue(new Error('metrics failed'))
    : vi.fn().mockResolvedValue(options.metricsBody ?? 'ok_metric 1');

  vi.doMock('../../src/services/internal-api-auth', () => ({
    hasValidInternalApiKey,
  }));
  vi.doMock('../../src/services/logger', () => ({
    getLogger: () => logger,
  }));
  vi.doMock('../../src/services/metrics', () => ({
    register: {
      contentType: options.contentType ?? 'text/plain; version=0.0.4',
      metrics,
    },
  }));

  const { default: handler } = await import('../../src/pages/api/metrics');

  const req = createMockRequest({
    method: options.method ?? 'GET',
    headers: { 'x-request-id': 'req-metrics' },
  });
  const res = createMockResponse();

  return { handler, req, res, metrics, logger };
}

describe('/api/metrics integration', () => {
  it('returns 401 when internal api key is invalid', async () => {
    const { handler, req, res } = await loadMetricsHandler({
      isAuthorized: false,
    });

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 405 for non-GET method and sets Allow header', async () => {
    const { handler, req, res } = await loadMetricsHandler({
      method: 'POST',
    });

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['GET']);
    expect(res.body).toEqual({ error: 'Method not allowed' });
  });

  it('returns 500 when metrics registry fails', async () => {
    const { handler, req, res } = await loadMetricsHandler({
      metricsThrows: true,
    });

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toBe('Error collecting metrics');
  });

  it('returns 200 with metrics payload and content type', async () => {
    const { handler, req, res, metrics } = await loadMetricsHandler({
      metricsBody: 'webhook_events_total 10',
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
    });

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe(
      'text/plain; version=0.0.4; charset=utf-8',
    );
    expect(res.body).toBe('webhook_events_total 10');
    expect(metrics).toHaveBeenCalledTimes(1);
  });
});
