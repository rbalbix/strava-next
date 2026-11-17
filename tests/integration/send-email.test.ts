import { describe, expect, it, vi } from 'vitest';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

type LoadOptions = {
  method?: string;
  isAuthorized?: boolean;
  body?: unknown;
  resendResult?: { data?: unknown; error?: { message?: string } | null };
  resendThrows?: boolean;
  resendFrom?: string;
  /** `null` simula `NEXT_PUBLIC_CONTACT_EMAIL` ausente no ambiente. */
  contactEmail?: string | null;
  /** Valor devolvido pelo `redis.incr` do rate limit. */
  rateLimitCurrent?: number;
};

const VALID_BODY = {
  template: 'webhook-error',
  params: { message: 'Hello', errorDetail: 'Body', stack: 'at x' },
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
  const redisIncr = vi.fn().mockResolvedValue(options.rateLimitCurrent ?? 1);
  const redisExpire = vi.fn().mockResolvedValue(1);
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
  // O destinatário vem do template resolvido no servidor, nunca do payload.
  if (options.contactEmail === null) {
    delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  } else {
    process.env.NEXT_PUBLIC_CONTACT_EMAIL =
      options.contactEmail ?? 'contato@example.com';
  }

  vi.doMock('../../src/services/internal-api-auth', () => ({
    hasValidInternalApiKey,
  }));
  vi.doMock('../../src/services/logger', () => ({
    getLogger: () => logger,
  }));
  vi.doMock('../../src/services/redis', () => ({
    default: {
      incr: redisIncr,
      expire: redisExpire,
    },
  }));
  vi.doMock('resend', () => ({ Resend }));

  const { default: handler } = await import('../../src/pages/api/send-email');

  const req = createMockRequest({
    method: options.method ?? 'POST',
    headers: { 'x-request-id': 'req-send-email' },
    body: options.body ?? VALID_BODY,
  });
  const res = createMockResponse();

  return {
    handler,
    req,
    res,
    resendSend,
    logger,
    hasValidInternalApiKey,
    redisIncr,
  };
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

  it('returns 400 for unknown template', async () => {
    const { handler, req, res } = await loadSendEmailHandler({
      body: { template: 'phishing-personalizado', params: {} },
    });

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid payload' });
  });

  it('returns 400 when params are not flat scalars', async () => {
    // Só escalares: um objeto aninhado não é renderizado por nenhum
    // template e não pode ser usado para contrabandear estrutura.
    const { handler, req, res } = await loadSendEmailHandler({
      body: {
        template: 'webhook-error',
        params: { message: { html: '<script>x</script>' } },
      },
    });

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid payload' });
  });

  it('rejects free-form to/subject/html (VULN-009)', async () => {
    const { handler, req, res } = await loadSendEmailHandler({
      body: {
        to: 'vitima@example.com',
        subject: 'Sua conta foi comprometida',
        html: '<p>Clique aqui</p>',
      },
    });

    await handler(req, res);

    // `.strict()` derruba os campos extras: o payload antigo não passa.
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

  it('returns 400 when the template has no recipient configured', async () => {
    const { handler, req, res } = await loadSendEmailHandler({
      contactEmail: null,
    });

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Missing email recipient configuration',
    });
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

  it('returns 429 when the rate limit is exceeded', async () => {
    const { handler, req, res, redisIncr } = await loadSendEmailHandler({
      rateLimitCurrent: 11, // teto é 10/min
    });

    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBe('60');
    expect(res.body).toEqual({ error: 'Rate limit exceeded' });
    // Cortado antes de qualquer trabalho: o Resend nem é chamado.
    expect(redisIncr).toHaveBeenCalledTimes(1);
  });

  it('returns 200 rendering the template server-side', async () => {
    const { handler, req, res, resendSend } = await loadSendEmailHandler();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { id: 'email_1' },
      message: 'Email sent successfully',
    });
    // Destinatário, assunto e HTML vêm do template — não do payload.
    expect(resendSend).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: ['contato@example.com'],
      subject: '[GearLife] - Erro no Webhook',
      html: expect.stringContaining('Body'),
    });
  });
});
