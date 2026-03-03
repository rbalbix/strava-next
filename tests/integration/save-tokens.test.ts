import { describe, expect, it, vi } from 'vitest';
import handler from '../../src/pages/api/save-tokens';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

const mocks = vi.hoisted(() => ({
  hasValidInternalApiKey: vi.fn(),
  saveStravaAuth: vi.fn(),
}));

vi.mock('../../src/services/internal-api-auth', () => ({
  hasValidInternalApiKey: mocks.hasValidInternalApiKey,
}));

vi.mock('../../src/services/strava-auth', () => ({
  saveStravaAuth: mocks.saveStravaAuth,
}));

vi.mock('../../src/services/logger', () => ({
  getLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() }),
}));

describe('/api/save-tokens integration', () => {
  it('returns 401 when api key is invalid', async () => {
    mocks.hasValidInternalApiKey.mockReturnValueOnce(false);
    const req = createMockRequest({ method: 'POST', body: {} });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 405 for non-POST method', async () => {
    mocks.hasValidInternalApiKey.mockReturnValueOnce(true);
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('returns 400 for invalid payload', async () => {
    mocks.hasValidInternalApiKey.mockReturnValueOnce(true);
    const req = createMockRequest({ method: 'POST', body: { athleteId: 1 } });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid payload' });
  });

  it('returns 200 and saves auth data for valid payload', async () => {
    mocks.hasValidInternalApiKey.mockReturnValueOnce(true);
    const req = createMockRequest({
      method: 'POST',
      body: {
        athleteId: 1,
        refreshToken: 'r',
        accessToken: 'a',
        expiresAt: 123,
        athleteInfo: { id: 1 },
      },
    });
    const res = createMockResponse();

    await handler(req, res);
    expect(mocks.saveStravaAuth).toHaveBeenCalledWith(1, 'r', 'a', 123, { id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Tokens salvos com sucesso',
    });
  });
});
