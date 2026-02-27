// pages/api/send-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { hasValidInternalApiKey } from '../../services/internal-api-auth';
import { getLogger } from '../../services/logger';

// Inicializa o Resend com sua API Key
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const log = getLogger(req.headers['x-request-id'] as string);

  if (!hasValidInternalApiKey(req)) {
    log.warn({ method: req.method }, 'Unauthorized request to send-email');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Apenas permite requisições POST
  if (req.method !== 'POST') {
    log.warn({ method: req.method }, 'Method not allowed on send-email');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, from = 'onboarding@resend.dev' } = req.body;

    // Validação básica dos campos obrigatórios
    if (!to || !subject || !html) {
      log.warn('Missing required fields in send-email payload');
      return res.status(400).json({
        error: 'Missing required fields: to, subject, or html',
      });
    }

    log.info(
      {
        recipients: Array.isArray(to) ? to.length : 1,
        subject,
      },
      'Sending email via Resend',
    );

    // Envia o email usando o Resend
    const { data, error } = await resend.emails.send({
      from: from,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
    });

    if (error) {
      log.error({ err: error }, 'Resend error');
      return res.status(400).json({
        error: error.message || 'Failed to send email',
      });
    }

    // Retorna sucesso
    log.info(
      { recipients: Array.isArray(to) ? to.length : 1, subject },
      'Email sent successfully',
    );
    res.status(200).json({
      success: true,
      data: data,
      message: 'Email sent successfully',
    });
  } catch (error) {
    log.error({ err: error }, 'Email sending error');
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}
