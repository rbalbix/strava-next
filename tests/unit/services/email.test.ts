import { beforeEach, describe, expect, it, vi } from 'vitest';

type LoadOptions = {
  postImpl?: ReturnType<typeof vi.fn>;
};

async function loadEmailModule(options: LoadOptions = {}) {
  vi.resetModules();

  const post = options.postImpl ?? vi.fn();
  const emailSentInc = vi.fn();
  const emailFailedInc = vi.fn();
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
});
