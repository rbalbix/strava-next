// pages/api/send-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { z } from 'zod';
import { hasValidInternalApiKey } from '../../services/internal-api-auth';
import { getLogger } from '../../services/logger';

// Inicializa o Resend com sua API Key
const resend = new Resend(process.env.RESEND_API_KEY);
const MAX_EMAIL_RECIPIENTS = 5;

const SendEmailSchema = z
  .object({
    to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
    subject: z.string().min(1).max(200),
    html: z.string().min(1).max(20000),
  })
  .strict();

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
    const parsed = SendEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn({ issues: parsed.error.issues }, 'Invalid send-email payload');
      return res.status(400).json({
        error: 'Invalid payload',
      });
    }

    const resendFrom = process.env.RESEND_EMAIL_FROM;
    if (!resendFrom) {
      log.error('Missing RESEND_EMAIL_FROM env var');
      return res.status(400).json({
        error: 'Missing email sender configuration',
      });
    }

    const recipients = Array.isArray(parsed.data.to)
      ? parsed.data.to
      : [parsed.data.to];
    if (recipients.length > MAX_EMAIL_RECIPIENTS) {
      log.warn({ recipients: recipients.length }, 'Too many email recipients');
      return res.status(400).json({
        error: `Maximum recipients exceeded (${MAX_EMAIL_RECIPIENTS})`,
      });
    }

    log.info(
      {
        recipients: recipients.length,
        subject: parsed.data.subject,
      },
      'Sending email via Resend',
    );

    // Envia o email usando o Resend
    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to: recipients,
      subject: parsed.data.subject,
      html: parsed.data.html,
    });

    if (error) {
      log.error({ err: error }, 'Resend error');
      return res.status(400).json({
        error: error.message || 'Failed to send email',
      });
    }

    // Retorna sucesso
    log.info(
      { recipients: recipients.length, subject: parsed.data.subject },
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
