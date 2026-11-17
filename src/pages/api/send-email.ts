// pages/api/send-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { SendEmailRequestSchema } from '../../contracts/api';
import { getEmailServerEnv } from '../../server/env';
import { EMAIL_TEMPLATES } from '../../services/email-templates';
import { hasValidInternalApiKey } from '../../services/internal-api-auth';
import { getLogger } from '../../services/logger';
import redis from '../../services/redis';

const MAX_EMAIL_RECIPIENTS = 5;
// Contenção melhor-esforço caso o token interno vaze (VULN-009): o único
// chamador legítimo é o handler de erro do webhook, que dispara raramente —
// 10/min sobra com folga e limita o estrago de um token comprometido.
const EMAIL_RATE_LIMIT_MAX_PER_MINUTE = 10;

async function enforceEmailRateLimit(
  log: { warn: (...args: unknown[]) => void },
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const window = Math.floor(Date.now() / 60000);
  const rateKey = `strava:email:rate:${window}`;
  try {
    const current = await redis.incr(rateKey);
    if (current === 1) {
      await redis.expire(rateKey, 120);
    }
    if (current > EMAIL_RATE_LIMIT_MAX_PER_MINUTE) {
      return { ok: false, retryAfter: 60 };
    }
    return { ok: true };
  } catch (error) {
    // Fail-open: o limite é guarda de contenção, não caminho crítico.
    // Derrubar a única notificação de erro do sistema por uma indisponibilidade
    // do Redis pioraria o cenário — e o Resend ainda tem cota própria.
    log.warn(
      { err: error },
      'Rate limit de e-mail indisponível; seguindo sem limite',
    );
    return { ok: true };
  }
}

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

  // Limite por minuto antes de qualquer trabalho: cobre tanto payloads
  // inválidos quanto chamadas válidas em rajada.
  const limit = await enforceEmailRateLimit(log);
  if (!limit.ok) {
    log.warn({ retryAfter: limit.retryAfter }, 'Email rate limit exceeded');
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  try {
    const parsed = SendEmailRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn({ issues: parsed.error.issues }, 'Invalid send-email payload');
      return res.status(400).json({
        error: 'Invalid payload',
      });
    }

    const env = getEmailServerEnv();
    if (!env.success) {
      log.error({ issues: env.error.issues }, 'Missing Resend env vars');
      return res.status(400).json({
        error: 'Missing email sender configuration',
      });
    }

    const params = parsed.data.params ?? {};
    // Defesa em profundidade: o `z.enum` já garante o nome, mas um template
    // sem definição não pode virar 500 silencioso.
    const definition = EMAIL_TEMPLATES[parsed.data.template];
    if (!definition) {
      log.warn({ template: parsed.data.template }, 'Unknown email template');
      return res.status(400).json({ error: 'Unknown email template' });
    }

    // Assunto e destinatários vêm do template, nunca do payload — é o que
    // impede usar o endpoint para disparar para endereços arbitrários.
    const recipients = definition.recipients(params);
    if (recipients.length === 0) {
      log.error('Missing NEXT_PUBLIC_CONTACT_EMAIL for template recipients');
      return res.status(400).json({
        error: 'Missing email recipient configuration',
      });
    }
    if (recipients.length > MAX_EMAIL_RECIPIENTS) {
      log.warn({ recipients: recipients.length }, 'Too many email recipients');
      return res.status(400).json({
        error: `Maximum recipients exceeded (${MAX_EMAIL_RECIPIENTS})`,
      });
    }

    const subject = definition.subject;
    const html = definition.render(params);

    log.info(
      {
        template: parsed.data.template,
        recipients: recipients.length,
        subject,
      },
      'Sending email via Resend',
    );

    // Envia o email usando o Resend
    const resend = new Resend(env.data.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: env.data.RESEND_EMAIL_FROM,
      to: recipients,
      subject,
      html,
    });

    if (error) {
      log.error({ err: error }, 'Resend error');
      return res.status(400).json({
        error: error.message || 'Failed to send email',
      });
    }

    // Retorna sucesso
    log.info(
      { template: parsed.data.template, recipients: recipients.length, subject },
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
