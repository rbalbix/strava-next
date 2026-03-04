import { describe, expect, it } from 'vitest';
import handler from '../../src/pages/api/logout';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

describe('/api/logout integration', () => {
  it('returns 405 for non-POST', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('clears cookies and returns success for POST', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(res.headers['Set-Cookie']).toBeTruthy();
  });
});
