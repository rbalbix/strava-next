import { beforeEach, describe, expect, it, vi } from 'vitest';

type LoadOptions = {
  postImpl?: ReturnType<typeof vi.fn>;
  emailSentIncImpl?: ReturnType<typeof vi.fn>;
  emailFailedIncImpl?: ReturnType<typeof vi.fn>;
};

async function loadEmailModule(options: LoadOptions = {}) {
  vi.resetModules();

  const post = options.postImpl ?? vi.fn();
  const emailSentInc = options.emailSentIncImpl ?? vi.fn();
  const emailFailedInc = options.emailFailedIncImpl ?? vi.fn();
  const logger = { error: vi.fn() };

  vi.doMock('../../../src/services/api', () => ({
    apiEmail: { post },
  }));
  vi.doMock('../../../src/services/metrics', () => ({
    emailSent: { inc: emailSentInc },
    emailFailed: { inc: emailFailedInc },
  }));
  vi.doMock('../../../src/services/logger', () => ({
    getLogger: () => logger,
  }));

  const mod = await import('../../../src/services/email');
  return { ...mod, post, emailSentInc, emailFailedInc, logger };
}

describe('email service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sendEmail returns data and increments emailSent on success', async () => {
    const postImpl = vi.fn().mockResolvedValue({
      status: 200,
      data: { id: 'email-1' },
    });
    const { sendEmail, post, emailSentInc, emailFailedInc } = await loadEmailModule({
      postImpl,
    });

    const payload = {
      to: 'foo@example.com',
      subject: 'Hello',
      html: '<p>Body</p>',
    };
    const result = await sendEmail(payload);

    expect(post).toHaveBeenCalledWith('/', JSON.stringify(payload));
    expect(result).toEqual({ id: 'email-1' });
    expect(emailSentInc).toHaveBeenCalledTimes(1);
    expect(emailFailedInc).not.toHaveBeenCalled();
  });

  it('sendEmail throws and increments emailFailed on non-2xx status', async () => {
    const postImpl = vi.fn().mockResolvedValue({
      status: 500,
      statusText: 'Internal Error',
      data: {},
    });
    const { sendEmail, emailFailedInc, logger } = await loadEmailModule({
      postImpl,
    });

    await expect(
      sendEmail({
        to: 'foo@example.com',
        subject: 'Hello',
        html: '<p>Body</p>',
      }),
    ).rejects.toThrow('Send email failed: 500 Internal Error');
    expect(emailFailedInc).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('sendEmail throws and increments emailFailed when apiEmail throws', async () => {
    const postImpl = vi.fn().mockRejectedValue(new Error('network fail'));
    const { sendEmail, emailFailedInc, logger } = await loadEmailModule({
      postImpl,
    });

    await expect(
      sendEmail({
        to: 'foo@example.com',
        subject: 'Hello',
        html: '<p>Body</p>',
      }),
    ).rejects.toThrow('network fail');
    expect(emailFailedInc).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('sendEmail continues when metric increment throws', async () => {
    const postImpl = vi
      .fn()
      .mockResolvedValueOnce({ status: 200, data: { ok: true } })
      .mockRejectedValueOnce(new Error('network fail'));

    const { sendEmail, logger } = await loadEmailModule({
      postImpl,
      emailSentIncImpl: vi.fn().mockImplementation(() => {
        throw new Error('metric sent fail');
      }),
      emailFailedIncImpl: vi.fn().mockImplementation(() => {
        throw new Error('metric failed fail');
      }),
    });

    await expect(
      sendEmail({ to: 'foo@example.com', subject: 'A', html: '<p>x</p>' }),
    ).resolves.toEqual({ ok: true });

    await expect(
      sendEmail({ to: 'foo@example.com', subject: 'B', html: '<p>y</p>' }),
    ).rejects.toThrow('network fail');

    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('createContactEmailTemplate renders contact fields', async () => {
    const { createContactEmailTemplate } = await loadEmailModule();
    const html = createContactEmailTemplate('Ana', 'ana@example.com', 'Oi!');

    expect(html).toContain('Ana');
    expect(html).toContain('ana@example.com');
    expect(html).toContain('Oi!');
    expect(html).toContain('Novo Contato - Stuff Stats');
  });

  it('createErrorEmailTemplate renders context details when provided', async () => {
    const { createErrorEmailTemplate } = await loadEmailModule();
    const html = createErrorEmailTemplate('Erro webhook', new Error('boom'), {
      eventType: 'activity',
      athleteId: 123,
      objectId: 456,
      activityUrl: 'https://www.strava.com/activities/456',
      message: 'x',
      error: 'boom',
    });

    expect(html).toContain('Erro webhook');
    expect(html).toContain('boom');
    expect(html).toContain('Contexto do Evento');
    expect(html).toContain('activity');
    expect(html).toContain('123');
    expect(html).toContain('456');
  });

  it('createErrorEmailTemplate renders without context and supports non-Error values', async () => {
    const { createErrorEmailTemplate } = await loadEmailModule();
    const html = createErrorEmailTemplate('Erro simples', { code: 500 });

    expect(html).toContain('Erro simples');
    expect(html).toContain('[object Object]');
    expect(html).not.toContain('Contexto do Evento');
  });

  it('createErrorEmailTemplate with partial context omits absent optional fields', async () => {
    const { createErrorEmailTemplate } = await loadEmailModule();
    const html = createErrorEmailTemplate('Erro parcial', new Error('boom'), {
      message: 'm',
      error: 'e',
    });

    expect(html).toContain('Contexto do Evento');
    expect(html).not.toContain('Tipo de Evento');
    expect(html).not.toContain('ID do Atleta');
    expect(html).not.toContain('ID do Objeto');
    expect(html).not.toContain('Link da Atividade');
  });
});
