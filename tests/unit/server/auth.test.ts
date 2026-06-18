import { describe, expect, it, vi } from 'vitest';
import { withProtectedAPI } from '../../../src/server/auth';
import { createMockRequest, createMockResponse } from '../../helpers/next-api';

describe('withProtectedAPI middleware', () => {
  it('returns 401 Unauthorized if strava_athleteId cookie is missing', async () => {
    const req = createMockRequest({
      method: 'GET',
      cookies: {},
    });
    const res = createMockResponse();

    const handler = vi.fn();
    const wrapped = withProtectedAPI(handler);

    await wrapped(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: 'Unauthorized',
      reason: 'Session expired or invalid',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('forwards the request to the underlying handler if strava_athleteId cookie is present', async () => {
    const req = createMockRequest({
      method: 'GET',
      cookies: { strava_athleteId: '55555' },
    });
    const res = createMockResponse();

    const handler = vi.fn();
    const wrapped = withProtectedAPI(handler);

    await wrapped(req, res);

    expect(handler).toHaveBeenCalledWith(req, res, 55555);
  });
});
