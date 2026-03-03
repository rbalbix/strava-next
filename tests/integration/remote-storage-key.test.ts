import { describe, expect, it, vi } from 'vitest';
import handler from '../../src/pages/api/remoteStorage/[key]';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

const mocks = vi.hoisted(() => ({
  hasValidInternalApiKey: vi.fn(),
  redisGet: vi.fn(),
}));

vi.mock('../../src/services/internal-api-auth', () => ({
  hasValidInternalApiKey: mocks.hasValidInternalApiKey,
}));

vi.mock('../../src/services/redis', () => ({
  default: {
    get: mocks.redisGet,
  },
}));

describe('/api/remoteStorage/[key] integration', () => {
  it('returns 401 when unauthorized', async () => {
    mocks.hasValidInternalApiKey.mockReturnValueOnce(false);
    const req = createMockRequest({ method: 'GET', query: { key: 'x' } });
    const res = createMockResponse();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for invalid key', async () => {
    mocks.hasValidInternalApiKey.mockReturnValueOnce(true);
    const req = createMockRequest({ method: 'GET', query: {} });
    const res = createMockResponse();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 200 with value for valid key', async () => {
    mocks.hasValidInternalApiKey.mockReturnValueOnce(true);
    mocks.redisGet.mockResolvedValueOnce('{"hello":"world"}');
    const req = createMockRequest({
      method: 'GET',
      query: { key: 'strava:statistics:123' },
    });
    const res = createMockResponse();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('{"hello":"world"}');
  });
});
