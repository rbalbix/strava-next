import { describe, expect, it, vi } from 'vitest';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: () => 'fixed-oauth-state',
  })),
}));

import handler from '../../src/pages/api/oauth/start';

describe('/api/oauth/start integration', () => {
  it('sets oauth state cookie and redirects to strava authorize url', () => {
    process.env.CLIENT_ID = 'client-id';
    process.env.RESPONSE_TYPE = 'code';
    process.env.APPROVAL_PROMPT = 'auto';
    process.env.STRAVA_SCOPE = 'read';

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
});
