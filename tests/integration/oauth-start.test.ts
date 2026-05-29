import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: () => 'fixed-oauth-state',
  })),
}));

import handler from '../../src/pages/api/oauth/start';

describe('/api/oauth/start integration', () => {
  beforeEach(() => {
    process.env.CLIENT_ID = 'client-id';
    process.env.RESPONSE_TYPE = 'code';
    process.env.APPROVAL_PROMPT = 'auto';
    process.env.STRAVA_SCOPE = 'read';
  });

  it('uses the request host for local development redirects', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_APP_URL = 'https://production.example';
    const req = createMockRequest({
      method: 'GET',
      headers: { host: 'localhost:3000', 'x-forwarded-proto': 'http' },
    });
    const res = createMockResponse();

    handler(req, res);
    expect(res.headers['Set-Cookie']).toContain('strava_oauth_state=fixed-oauth-state');
    expect(res.redirectedTo).toContain('https://www.strava.com/oauth/authorize');
    expect(res.redirectedTo).toContain('state=fixed-oauth-state');
    expect(res.redirectedTo).toContain(
      encodeURIComponent('http://localhost:3000/api/authorize'),
    );
  });

  it('uses configured public app url in production redirects', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_APP_URL = 'https://production.example/';
    const req = createMockRequest({
      method: 'GET',
      headers: { host: 'localhost:3000', 'x-forwarded-proto': 'http' },
    });
    const res = createMockResponse();

    handler(req, res);

    expect(res.redirectedTo).toContain(
      encodeURIComponent('https://production.example/api/authorize'),
    );
  });
});
