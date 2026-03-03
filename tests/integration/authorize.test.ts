import { describe, expect, it, vi } from 'vitest';
import handler from '../../src/pages/api/authorize';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

const mocks = vi.hoisted(() => ({
  apiStravaOauthTokenPost: vi.fn(),
  apiStravaAuthPost: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('../../src/services/api', () => ({
  apiStravaOauthToken: { post: mocks.apiStravaOauthTokenPost },
  apiStravaAuth: { post: mocks.apiStravaAuthPost },
}));

vi.mock('../../src/services/logger', () => ({
  getLogger: () => ({ error: mocks.loggerError }),
}));

describe('/api/authorize integration', () => {
  it('returns 400 when code is missing', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: {},
    });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Code parameter is missing or invalid' });
  });

  it('returns 400 when oauth state is invalid', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { code: 'abc', state: 'bad' },
      headers: { cookie: 'strava_oauth_state=good' },
    });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid OAuth state' });
    expect(res.headers['Set-Cookie']).toBeTruthy();
  });

  it('redirects to home and saves tokens on success', async () => {
    mocks.apiStravaOauthTokenPost.mockResolvedValueOnce({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_at: 123456,
        athlete: { id: 999 },
      },
    });
    const req = createMockRequest({
      method: 'GET',
      query: { code: 'abc', state: 'good' },
      headers: { cookie: 'strava_oauth_state=good' },
    });
    const res = createMockResponse();

    await handler(req, res);
    expect(mocks.apiStravaAuthPost).toHaveBeenCalledWith(
      '/',
      expect.objectContaining({ athleteId: 999, accessToken: 'access' }),
    );
    expect(res.redirectedTo).toBe('/');
  });

  it('redirects to /404 when downstream fails', async () => {
    mocks.apiStravaOauthTokenPost.mockRejectedValueOnce(new Error('boom'));
    const req = createMockRequest({
      method: 'GET',
      query: { code: 'abc', state: 'good' },
      headers: { cookie: 'strava_oauth_state=good' },
    });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.redirectedTo).toBe('/404');
    expect(mocks.loggerError).toHaveBeenCalled();
  });
});
