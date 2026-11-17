import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createContactEmailTemplate,
  createErrorEmailTemplate,
} from '../../../src/services/email-templates';

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

// O chamador pede um template; assunto/destinatários/HTML saem do
// registro no servidor (VULN-009) — payload livre não existe mais.
const webhookErrorPayload = {
  template: 'webhook-error' as const,
  params: { message: 'Hello', errorDetail: 'Body' },
};

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

    const result = await sendEmail(webhookErrorPayload);

    expect(post).toHaveBeenCalledWith(
      '/',
      JSON.stringify(webhookErrorPayload),
    );
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

    await expect(sendEmail(webhookErrorPayload)).rejects.toThrow(
      'Send email failed: 500 Internal Error',
    );
    expect(emailFailedInc).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    // O log registra o template, nunca os params (podem conter dado do usuário).
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'webhook-error' }),
      'Email service error',
    );
  });

  it('sendEmail throws and increments emailFailed when apiEmail throws', async () => {
    const postImpl = vi.fn().mockRejectedValue(new Error('network fail'));
    const { sendEmail, emailFailedInc, logger } = await loadEmailModule({
      postImpl,
    });

    await expect(sendEmail(webhookErrorPayload)).rejects.toThrow(
      'network fail',
    );
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
      sendEmail({ template: 'contact', params: { message: 'A' } }),
    ).resolves.toEqual({ ok: true });

    await expect(
      sendEmail({ template: 'contact', params: { message: 'B' } }),
    ).rejects.toThrow('network fail');

    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});

describe('email templates', () => {
  it('createContactEmailTemplate renders contact fields', () => {
    const html = createContactEmailTemplate({
      name: 'Ana',
      email: 'ana@example.com',
      message: 'Oi!',
    });

    expect(html).toContain('Ana');
    expect(html).toContain('ana@example.com');
    expect(html).toContain('Oi!');
    expect(html).toContain('Novo Contato - GearLife');
  });

  it('createContactEmailTemplate escapes HTML nos params (VULN-009)', () => {
    const html = createContactEmailTemplate({
      name: '<script>alert(1)</script>',
      email: 'ana@example.com',
      message: '<b>negrito</b> & "aspas"',
    });

    // Nada de marcagem vindo do formulário chega ao e-mail do dono.
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>negrito</b>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;negrito&lt;/b&gt;');
    expect(html).toContain('&amp; &quot;aspas&quot;');
  });

  it('createErrorEmailTemplate renders context details when provided', () => {
    const html = createErrorEmailTemplate({
      message: 'Erro webhook',
      errorDetail: 'boom',
      eventType: 'activity',
      athleteId: 123,
      objectId: 456,
      activityUrl: 'https://www.strava.com/activities/456',
    });

    expect(html).toContain('Erro webhook');
    expect(html).toContain('boom');
    expect(html).toContain('Contexto do Evento');
    expect(html).toContain('activity');
    expect(html).toContain('123');
    expect(html).toContain('456');
  });

  it('createErrorEmailTemplate renders without context', () => {
    const html = createErrorEmailTemplate({
      message: 'Erro simples',
      errorDetail: 'boom',
    });

    expect(html).toContain('Erro simples');
    expect(html).toContain('boom');
    expect(html).not.toContain('Contexto do Evento');
  });

  it('createErrorEmailTemplate with partial context omits absent optional fields', () => {
    const html = createErrorEmailTemplate({
      message: 'Erro parcial',
      errorDetail: 'e',
      eventType: 'activity',
    });

    expect(html).toContain('Contexto do Evento');
    expect(html).toContain('Tipo de Evento');
    expect(html).not.toContain('ID do Atleta');
    expect(html).not.toContain('ID do Objeto');
    expect(html).not.toContain('Link da Atividade');
  });

  it('createErrorEmailTemplate escapa stack/detail e só linka https', () => {
    const html = createErrorEmailTemplate({
      message: 'Erro',
      errorDetail: '<img src=x onerror=alert(1)>',
      stack: 'at foo() <bar>',
      activityUrl: 'javascript:alert(1)',
    });

    expect(html).not.toContain('<img');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('at foo() &lt;bar&gt;');
    expect(html).not.toContain('Link da Atividade');
  });
});
