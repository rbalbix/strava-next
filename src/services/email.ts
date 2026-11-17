import { apiEmail } from './api';
import type { EmailTemplateName, EmailTemplateParams } from './email-templates';
import { getLogger } from './logger';
import { emailSent, emailFailed } from './metrics';

/**
 * Payload aceito por `/api/send-email`.
 *
 * Não existe mais `to`/`subject`/`html` livres (VULN-009): o chamador pede
 * um template nomeado com params planos, e o endpoint resolve assunto,
 * destinatários e HTML no servidor. Um token interno vazado não consegue
 * mais enviar conteúdo arbitrário para endereços arbitrários.
 */
export interface SendEmailPayload {
  template: EmailTemplateName;
  params?: EmailTemplateParams;
}

export async function sendEmail(payload: SendEmailPayload) {
  try {
    const response = await apiEmail.post('/', JSON.stringify(payload));

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
      { error, template: payload.template },
      'Email service error',
    );
    throw error;
  }
}

export interface WebhookErrorContext {
  message: string;
  error: unknown;
  eventType?: string;
  athleteId?: number;
  objectId?: number;
  activityUrl?: string;
}
