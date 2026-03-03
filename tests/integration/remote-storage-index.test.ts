import { describe, expect, it, vi } from 'vitest';
import handler from '../../src/pages/api/remoteStorage/index';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

const mocks = vi.hoisted(() => ({
  hasValidInternalApiKey: vi.fn(),
  redisSet: vi.fn(),
}));

vi.mock('../../src/services/internal-api-auth', () => ({
  hasValidInternalApiKey: mocks.hasValidInternalApiKey,
}));

vi.mock('../../src/services/redis', () => ({
  default: {
    set: mocks.redisSet,
  },
}));

describe('/api/remoteStorage (index) integration', () => {
  it('returns 401 when unauthorized', async () => {
    mocks.hasValidInternalApiKey.mockReturnValueOnce(false);
    const req = createMockRequest({ method: 'POST', body: {} });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for forbidden key', async () => {
    mocks.hasValidInternalApiKey.mockReturnValueOnce(true);
    const req = createMockRequest({
      method: 'POST',
      body: { key: 'invalid:key', value: '{}' },
    });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });

  it('stores value and returns 201 for valid key', async () => {
    mocks.hasValidInternalApiKey.mockReturnValueOnce(true);
    const req = createMockRequest({
      method: 'POST',
      body: { key: 'strava:activities:123', value: '{"ok":true}' },
    });
    const res = createMockResponse();

    await handler(req, res);
    expect(mocks.redisSet).toHaveBeenCalledWith('strava:activities:123', '{"ok":true}');
    expect(res.statusCode).toBe(201);
  });
});
