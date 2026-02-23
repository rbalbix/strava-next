import { apiEmail } from './api';
import { getLogger } from './logger';
import { emailSent, emailFailed } from './metrics';

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(emailData: EmailData) {
  try {
    const response = await apiEmail.post('/', JSON.stringify(emailData));

    if (response.status >= 200 && response.status < 300) {
      try {
        emailSent.inc();
      } catch (_) {}
      return response.data;
    } else {
      throw new Error(
        `Send email failed: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    try {
      emailFailed.inc();
    } catch (_) {}
    const log = getLogger();
    log.error(
      { error, to: emailData.to, subject: emailData.subject },
      'Email service error',
    );
    throw error;
  }
}

// Template de email simples de contato
export function createContactEmailTemplate(
  name: string,
  email: string,
  message: string,
): string {
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
          <h1>Novo Contato - Stuff Stats</h1>
        </div>
        <div class="content">
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mensagem:</strong></p>
          <p>${message}</p>
        </div>
        <div class="footer">
          <p>Email enviado automaticamente pelo sistema Stuff Stats</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export interface WebhookErrorContext {
  message: string;
  error: unknown;
  eventType?: string;
  athleteId?: number;
  objectId?: number;
  activityUrl?: string;
}

export function createErrorEmailTemplate(
  message: string,
  error: unknown,
  context?: WebhookErrorContext,
): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';
  const timestamp = new Date().toISOString();

  const detailsHtml = context
    ? `
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
    <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-top: 20px;">
      <h3 style="margin-top: 0;">Contexto do Evento</h3>
      ${context.eventType ? `<p><strong>Tipo de Evento:</strong> ${context.eventType}</p>` : ''}
      ${context.athleteId ? `<p><strong>ID do Atleta:</strong> ${context.athleteId}</p>` : ''}
      ${context.objectId ? `<p><strong>ID do Objeto:</strong> ${context.objectId}</p>` : ''}
      ${context.activityUrl ? `<p><strong>Link da Atividade:</strong> <a href="${context.activityUrl}">${context.activityUrl}</a></p>` : ''}
      <p><strong>Timestamp:</strong> ${timestamp}</p>
    </div>
  `
    : '';

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
          <h1>⚠️ Erro no Webhook - Stuff Stats</h1>
        </div>
        <div class="content">
          <p><strong>Tipo de Erro:</strong> ${message}</p>
          <div class="error-box">${errorMessage}${errorStack ? '\n\n' + errorStack : ''}</div>
          ${detailsHtml}
        </div>
        <div class="footer">
          <p>Email enviado automaticamente pelo sistema Stuff Stats</p>
          <p>Timestamp: ${timestamp}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
