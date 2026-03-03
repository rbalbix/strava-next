import { describe, expect, it, vi } from 'vitest';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

type LoadOptions = {
  method?: string;
  isAuthorized?: boolean;
  body?: unknown;
  resendResult?: { data?: unknown; error?: { message?: string } | null };
  resendThrows?: boolean;
  resendFrom?: string;
};

async function loadSendEmailHandler(options: LoadOptions = {}) {
  vi.resetModules();

  const hasValidInternalApiKey = vi
    .fn()
    .mockReturnValue(options.isAuthorized ?? true);
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const resendSend = options.resendThrows
    ? vi.fn().mockRejectedValue(new Error('resend down'))
    : vi.fn().mockResolvedValue(
        options.resendResult ?? {
          data: { id: 'email_1' },
          error: null,
        },
      );
  const Resend = vi.fn().mockImplementation(() => ({
    emails: {
      send: resendSend,
    },
  }));

  process.env.RESEND_EMAIL_FROM = options.resendFrom ?? 'noreply@example.com';
  process.env.RESEND_API_KEY = 'test-key';

  vi.doMock('../../src/services/internal-api-auth', () => ({
    hasValidInternalApiKey,
  }));
  vi.doMock('../../src/services/logger', () => ({
    getLogger: () => logger,
  }));
  vi.doMock('resend', () => ({ Resend }));

  const { default: handler } = await import('../../src/pages/api/send-email');

  const req = createMockRequest({
    method: options.method ?? 'POST',
    headers: { 'x-request-id': 'req-send-email' },
    body:
      options.body ??
      {
        to: 'foo@example.com',
        subject: 'Hello',
        html: '<p>Body</p>',
      },
  });
  const res = createMockResponse();

  return { handler, req, res, resendSend, logger, hasValidInternalApiKey };
}

describe('/api/send-email integration', () => {
  it('returns 401 when internal api key is invalid', async () => {
    const { handler, req, res } = await loadSendEmailHandler({
      isAuthorized: false,
    });

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 405 for non-POST method', async () => {
    const { handler, req, res } = await loadSendEmailHandler({
      method: 'GET',
    });

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'Method not allowed' });
  });

  it('returns 400 for invalid payload', async () => {
    const { handler, req, res } = await loadSendEmailHandler({
      body: { to: 'invalid-email', subject: '', html: '' },
    });

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid payload' });
  });

  it('returns 400 when RESEND_EMAIL_FROM is missing', async () => {
    const { handler, req, res } = await loadSendEmailHandler({
      resendFrom: '',
    });

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Missing email sender configuration' });
  });

  it('returns 400 when recipients exceed limit', async () => {
    const { handler, req, res } = await loadSendEmailHandler({
      body: {
        to: [
          'a@e.com',
          'b@e.com',
          'c@e.com',
          'd@e.com',
          'e@e.com',
          'f@e.com',
        ],
        subject: 'Subject',
        html: '<p>Body</p>',
      },
    });

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Maximum recipients exceeded (5)' });
  });

  it('returns 400 when resend returns error', async () => {
    const { handler, req, res } = await loadSendEmailHandler({
      resendResult: { data: null, error: { message: 'quota exceeded' } },
    });

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'quota exceeded' });
  });

  it('returns 500 when resend throws', async () => {
    const { handler, req, res } = await loadSendEmailHandler({
      resendThrows: true,
    });

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  it('returns 200 for valid send-email request', async () => {
    const { handler, req, res, resendSend } = await loadSendEmailHandler();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { id: 'email_1' },
      message: 'Email sent successfully',
    });
    expect(resendSend).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: ['foo@example.com'],
      subject: 'Hello',
      html: '<p>Body</p>',
    });
  });
});
