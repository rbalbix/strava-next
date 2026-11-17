/**
 * Templates de e-mail — fix do VULN-009.
 *
 * `/api/send-email` **não aceita HTML livre**: o chamador envia o nome de um
 * template e params planos; assunto, destinatários e HTML são resolvidos
 * aqui, no servidor. Um token interno vazado deixa de ser um mailer de
 * phishing — só dá para disparar o que está registrado neste arquivo, com o
 * conteúdo e os destinatários que ele define.
 *
 * Os nomes vêm do contrato (`contracts/api.ts`): `EMAIL_TEMPLATES` é tipado
 * como `Record<SendEmailRequest['template'], ...>`, então cadastrar um nome
 * no `z.enum` sem definição aqui — ou definir um template que o contrato não
 * aceita — quebra o typecheck.
 */
import type { SendEmailRequest } from '../contracts/api';

export type EmailTemplateName = SendEmailRequest['template'];

/** Params planos e serializáveis: só escalares trafegam por JSON. */
export type EmailTemplateParams = Record<string, string | number | boolean>;

export interface EmailTemplateDefinition {
  /** Assunto fixo do template — o chamador não controla. */
  subject: string;
  /** Destinatários resolvidos no servidor, nunca vindos do payload. */
  recipients: (params: EmailTemplateParams) => string[];
  render: (params: EmailTemplateParams) => string;
}

/**
 * Escapa valores para interpolação em HTML.
 *
 * Sem isto, `name`/`message`/`errorDetail` vindos de fora permitiriam
 * injetar marcagem no e-mail (fechar a tag, alterar o layout, links
 * falsos).
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stringParam(
  params: EmailTemplateParams,
  key: string,
): string {
  const value = params[key];
  return typeof value === 'string' ? value : '';
}

function intParam(
  params: EmailTemplateParams,
  key: string,
): number | undefined {
  const value = params[key];
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

/**
 * Destinatário dos templates atuais: o e-mail de contato do dono.
 *
 * `NEXT_PUBLIC_CONTACT_EMAIL` é público de propósito (aparece na página de
 * contato); não é segredo. Sem ela configurada não há para quem enviar — o
 * endpoint responde 400 em vez de tentar adivinhar.
 */
function ownerRecipient(): string[] {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return contact ? [contact] : [];
}

/**
 * Template de notificação de erro do webhook.
 *
 * Recebe params já serializados (o `Error` não sobrevive ao JSON: mensagem
 * e stack são extraídas por quem chama) e os interpola escapados.
 */
export function createErrorEmailTemplate(
  params: EmailTemplateParams,
): string {
  const message = escapeHtml(stringParam(params, 'message'));
  const errorDetail = escapeHtml(stringParam(params, 'errorDetail'));
  const stack = escapeHtml(stringParam(params, 'stack'));

  const eventType = escapeHtml(stringParam(params, 'eventType'));
  const athleteId = intParam(params, 'athleteId');
  const objectId = intParam(params, 'objectId');
  const activityUrlRaw = stringParam(params, 'activityUrl');
  // Só `https://` vira link: um `javascript:` vindo do params não pode
  // virar href clicável.
  const activityUrl = /^https:\/\//i.test(activityUrlRaw)
    ? escapeHtml(activityUrlRaw)
    : '';

  const timestamp = new Date().toISOString();

  const detailsHtml =
    eventType || athleteId || objectId || activityUrl
      ? `
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
    <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-top: 20px;">
      <h3 style="margin-top: 0;">Contexto do Evento</h3>
      ${eventType ? `<p><strong>Tipo de Evento:</strong> ${eventType}</p>` : ''}
      ${athleteId ? `<p><strong>ID do Atleta:</strong> ${athleteId}</p>` : ''}
      ${objectId ? `<p><strong>ID do Objeto:</strong> ${objectId}</p>` : ''}
      ${activityUrl ? `<p><strong>Link da Atividade:</strong> <a href="${activityUrl}">${activityUrl}</a></p>` : ''}
      <p><strong>Timestamp:</strong> ${timestamp}</p>
    </div>
  `
      : '';

  const errorBoxBody = stack ? `${errorDetail}\n\n${stack}` : errorDetail;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; }
        .error-box { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 4px; margin: 15px 0; font-family: monospace; white-space: pre-wrap; word-break: break-word; font-size: 12px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Erro no Webhook - GearLife</h1>
        </div>
        <div class="content">
          <p><strong>Tipo de Erro:</strong> ${message}</p>
          <div class="error-box">${errorBoxBody}</div>
          ${detailsHtml}
        </div>
        <div class="footer">
          <p>Email enviado automaticamente pelo sistema GearLife</p>
          <p>Timestamp: ${timestamp}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Notificação de novo contato (formulário de contato).
 *
 * Os três campos são texto vindo do formulário e por isso **escaped**: sem
 * escape, uma mensagem com `<a href="...">` reescreveria o e-mail do dono.
 */
export function createContactEmailTemplate(
  params: EmailTemplateParams,
): string {
  const name = escapeHtml(stringParam(params, 'name'));
  const email = escapeHtml(stringParam(params, 'email'));
  const message = escapeHtml(stringParam(params, 'message'));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007aff; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Novo Contato - GearLife</h1>
        </div>
        <div class="content">
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mensagem:</strong></p>
          <p>${message}</p>
        </div>
        <div class="footer">
          <p>Email enviado automaticamente pelo sistema GearLife</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/** Registro dos templates aceitos pelo endpoint. */
export const EMAIL_TEMPLATES: Record<
  EmailTemplateName,
  EmailTemplateDefinition
> = {
  'webhook-error': {
    subject: '[GearLife] - Erro no Webhook',
    recipients: ownerRecipient,
    render: createErrorEmailTemplate,
  },
  contact: {
    subject: '[GearLife] - Novo Contato',
    recipients: ownerRecipient,
    render: createContactEmailTemplate,
  },
};
