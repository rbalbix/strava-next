import type { NextApiRequest, NextApiResponse } from 'next';
import type { Logger } from 'pino';
import { REDIS_KEYS } from '../../config';
import { getEmailServerEnv, getStravaServerEnv } from '../../server/env';
import { createStravaClient } from '../../server/strava-client';
import {
  ActivityBase,
  fetchStravaActivity,
  getActivities,
  processActivity,
  withActivitiesWriteLock,
} from '../../services/activity';
import { apiRemoteStorage } from '../../services/api';
import { getAthlete } from '../../services/athlete';
import {
  sendEmail,
  type WebhookErrorContext,
} from '../../services/email';
import { getGears } from '../../services/gear';
import { getLogger } from '../../services/logger';
import { updateStatistics } from '../../services/statistics';
import { getAthleteAccessToken } from '../../services/strava-auth';
import {
  validateWebhookEvent,
  type StravaWebhookEvent,
} from '../../services/webhook-validation';
import { mergeActivities } from '../../services/utils';
import { webhookEvents, webhookValidationFailed } from '../../services/metrics';
import redis from '../../services/redis';

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WEBHOOK_ALLOWED_IPS = (process.env.WEBHOOK_ALLOWED_IPS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const WEBHOOK_SUBSCRIPTION_ID = process.env.WEBHOOK_SUBSCRIPTION_ID
  ? Number(process.env.WEBHOOK_SUBSCRIPTION_ID)
  : null;
const WEBHOOK_RATE_LIMIT_MAX_PER_MINUTE = 60;
// Limite por IP (sem chave de atleta), aplicado antes da checagem de
// `subscription_id` — sem ele, o brute-force do ID de assinatura passava sem
// nenhuma limitação (VULN-003). Mais permissivo que o limite por atleta para
// não afetar o Strava (que dispara vários eventos por janela do mesmo IP).
const WEBHOOK_IP_RATE_LIMIT_MAX_PER_MINUTE = 180;
const WEBHOOK_REPLAY_TTL_SECONDS = 2 * 60 * 60; // 2 hours

/**
 * IP de origem do request (rate limit, allowlist e logs).
 *
 * Lê a **primeira** entrada de `X-Forwarded-For`.
 *
 * VULN-007 — verificado em produção em 17/11/2026: um
 * `curl -H 'X-Forwarded-For: 1.2.3.4'` contra `/api/webhook` logou
 * `sourceIp: 189.123.19.47` (IP real do cliente), não o forjado. A Vercel
 * **sobrescreve** o header inteiro (docs oficiais: "we currently overwrite
 * the X-Forwarded-For header ... to prevent IP spoofing"), então a lista tem
 * um único valor e a primeira posição é a confiável — não explorável.
 *
 * Reavaliar se:
 *  - o deploy sair da Vercel: em proxy que faz *append* do IP, a posição
 *    confiável é a **última** entrada, não a primeira;
 *  - entrar um proxy na frente da Vercel (Cloudflare etc.): `sourceIp` passa
 *    a ser o IP do proxy e `WEBHOOK_ALLOWED_IPS` precisa listá-lo.
 */
function getClientIp(req: NextApiRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].split(',')[0].trim();
  }
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed.startsWith('::ffff:')) {
    return trimmed.replace('::ffff:', '');
  }
  return trimmed;
}

function isIPv4(value: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const n = Number(part);
    return Number.isInteger(n) && n >= 0 && n <= 255 && String(n) === part;
  });
}

function ipv4ToInt(value: string): number {
  return value
    .split('.')
    .map((part) => Number(part))
    .reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [base, prefixText] = cidr.split('/');
  if (!base || prefixText === undefined) return false;
  if (!isIPv4(base) || !isIPv4(ip)) return false;

  const prefix = Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  if (prefix === 0) return true;

  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  return (ipInt & mask) === (baseInt & mask);
}

function isAllowedWebhookSource(sourceIp: string): boolean {
  const ip = normalizeIp(sourceIp);
  if (!ip || ip === 'unknown') return false;

  return WEBHOOK_ALLOWED_IPS.some((entry) => {
    if (entry.includes('/')) {
      return isIpInCidr(ip, entry);
    }
    return normalizeIp(entry) === ip;
  });
}

async function enforceWebhookRateLimit(
  req: NextApiRequest,
  athleteId: number,
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const ip = getClientIp(req);
  const window = Math.floor(Date.now() / 60000);
  const rateKey = `strava:webhook:rate:${athleteId}:${ip}:${window}`;
  const current = await redis.incr(rateKey);
  if (current === 1) {
    await redis.expire(rateKey, 120);
  }
  if (current > WEBHOOK_RATE_LIMIT_MAX_PER_MINUTE) {
    return { ok: false, retryAfter: 60 };
  }
  return { ok: true };
}

/**
 * Limite global por IP, aplicado **antes** da checagem de `subscription_id`.
 *
 * O limite por atleta só roda depois do `hasAuth`, e o `subscription_id` era
 * validado antes de qualquer rate limit — o brute-force do ID de assinatura
 * (VULN-003) passava ilimitado. Como o ID de assinatura é um número pequeno,
 * bastava pacote de força bruta para acertá-lo; daí o teto por IP aqui.
 *
 * **Depende de `getClientIp` ser confiável** (VULN-007): se o proxy da frente
 * deixar o cliente forjar `X-Forwarded-For`, a chave do limite é forjável
 * também. Verificado em produção em 17/11/2026 (ver docblock de `getClientIp`):
 * a Vercel sobrescreve o header — a chave não é forjável hoje.
 */
async function enforceWebhookIpRateLimit(
  req: NextApiRequest,
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const ip = normalizeIp(getClientIp(req));
  const window = Math.floor(Date.now() / 60000);
  const rateKey = `strava:webhook:rate:ip:${ip}:${window}`;
  const current = await redis.incr(rateKey);
  if (current === 1) {
    await redis.expire(rateKey, 120);
  }
  if (current > WEBHOOK_IP_RATE_LIMIT_MAX_PER_MINUTE) {
    return { ok: false, retryAfter: 60 };
  }
  return { ok: true };
}

function getWebhookReplayKey(event: StravaWebhookEvent): string {
  return `strava:webhook:seen:${event.owner_id}:${event.object_type}:${event.object_id}:${event.aspect_type}:${event.event_time}`;
}

async function guardWebhookReplay(event: StravaWebhookEvent): Promise<boolean> {
  const inserted = await redis.set(getWebhookReplayKey(event), '1', {
    nx: true,
    ex: WEBHOOK_REPLAY_TTL_SECONDS,
  });
  return Boolean(inserted);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Validação do webhook (GET)
  if (req.method === 'GET') {
    const log = getLogger(req.headers['x-request-id'] as string);
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Fail-closed: sem a env configurada, `token === VERIFY_TOKEN` virava
    // `undefined === undefined` e validava a verificação sem token — qualquer
    // originador ativava o webhook (mesma molde do guard de subscription_id).
    if (!VERIFY_TOKEN) {
      log.error('Missing VERIFY_TOKEN configuration');
      return res
        .status(500)
        .json({ error: 'Webhook verification not configured' });
    }

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      log.info('Webhook validado com sucesso');
      return res.status(200).json({ 'hub.challenge': challenge });
    }
    log.warn(
      { receivedToken: token },
      'Falha na validação do webhook - token inválido',
    );
    return res.status(403).json({ error: 'Token inválido' });
  }

  // Processamento de eventos (POST)
  if (req.method === 'POST') {
    const log = getLogger(req.headers['x-request-id'] as string);
    let replayKey: string | null = null;

    // In production, require subscription pinning. IP allowlist is optional.
    if (process.env.NODE_ENV === 'production') {
      if (
        WEBHOOK_SUBSCRIPTION_ID === null ||
        !Number.isFinite(WEBHOOK_SUBSCRIPTION_ID) ||
        WEBHOOK_SUBSCRIPTION_ID <= 0
      ) {
        log.error('Missing WEBHOOK_SUBSCRIPTION_ID in production');
        return res
          .status(500)
          .json({ error: 'Webhook subscription guard not configured' });
      }
    }

    const sourceIp = getClientIp(req);
    if (WEBHOOK_ALLOWED_IPS.length > 0 && !isAllowedWebhookSource(sourceIp)) {
      log.warn({ sourceIp }, 'Webhook denied: source IP not allowed');
      return res.status(403).json({ error: 'Webhook source not allowed' });
    }

    // Reject attempts to use the verification query on POST (verification is GET-only)
    if (req.query['hub.verify_token']) {
      return res.status(400).json({ error: 'Invalid method for verification' });
    }

    try {
      log.info(
        {
          sourceIp,
          contentType: req.headers['content-type'],
          contentLength: req.headers['content-length'],
        },
        'Webhook recebido',
      );

      // Rate limit por IP ANTES de qualquer lógica de payload: cobre o
      // brute-force do `subscription_id` e payloads inválidos (VULN-003).
      const ipLimit = await enforceWebhookIpRateLimit(req);
      if (!ipLimit.ok) {
        log.warn(
          { sourceIp, retryAfter: ipLimit.retryAfter },
          'Webhook rate limit exceeded (per IP)',
        );
        res.setHeader('Retry-After', String(ipLimit.retryAfter));
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      // Validate payload with Zod schema
      const validation = validateWebhookEvent(req.body);
      if (!validation.success) {
        const details = (validation as { success: false; error: string }).error;
        log.warn({ details }, 'Webhook payload failed validation');
        try {
          webhookValidationFailed.inc();
        } catch (_) {}
        return res.status(400).json({ error: 'Invalid payload', details });
      }

      const event = (validation as { success: true; data: StravaWebhookEvent })
        .data;

      if (
        WEBHOOK_SUBSCRIPTION_ID !== null &&
        Number.isFinite(WEBHOOK_SUBSCRIPTION_ID) &&
        event.subscription_id !== WEBHOOK_SUBSCRIPTION_ID
      ) {
        log.warn(
          {
            receivedSubscriptionId: event.subscription_id,
            expectedSubscriptionId: WEBHOOK_SUBSCRIPTION_ID,
          },
          'Webhook denied: subscription_id mismatch',
        );
        return res.status(403).json({ error: 'Invalid subscription' });
      }

      const hasAuth = await redis.exists(REDIS_KEYS.auth(event.owner_id));
      if (!hasAuth) {
        if (event.object_type === 'athlete' && event.aspect_type === 'delete') {
          log.info(
            { athleteId: event.owner_id },
            'Athlete delete webhook for non-existing auth; treating as idempotent',
          );
        } else {
          log.warn(
            { athleteId: event.owner_id, objectId: event.object_id },
            'Webhook ignored: athlete without stored auth',
          );
          return res.status(403).json({ error: 'Athlete not authorized' });
        }
      }

      if (hasAuth) {
        const allowed = await enforceWebhookRateLimit(req, event.owner_id);
        if (!allowed.ok) {
          log.warn(
            { athleteId: event.owner_id, retryAfter: allowed.retryAfter },
            'Webhook rate limit exceeded',
          );
          res.setHeader('Retry-After', String(allowed.retryAfter));
          return res.status(429).json({ error: 'Rate limit exceeded' });
        }

        const isNewEvent = await guardWebhookReplay(event);
        if (!isNewEvent) {
          log.info(
            { athleteId: event.owner_id, objectId: event.object_id },
            'Duplicate webhook ignored',
          );
          return res.status(200).json({ received: true, duplicate: true });
        }
        replayKey = getWebhookReplayKey(event);
      }

      try {
        webhookEvents.inc({
          object_type: event.object_type,
          aspect_type: event.aspect_type,
        });
      } catch (_) {}
      log.info(
        {
          objectType: event.object_type,
          objectId: event.object_id,
          athleteId: event.owner_id,
          aspectType: event.aspect_type,
        },
        'Webhook validated',
      );

      // Process events
      switch (event.object_type) {
        case 'activity':
          log.info({ event }, 'DEBUG_WEBHOOK_ACTIVITY: Starting handler');
          await handleActivityEvent(event, log);
          log.info({ event }, 'DEBUG_WEBHOOK_ACTIVITY: Handler completed');
          break;
        case 'athlete':
          log.info({ event }, 'DEBUG_WEBHOOK_ATHLETE: Starting handler');
          await handleAthleteEvent(event, log);
          log.info({ event }, 'DEBUG_WEBHOOK_ATHLETE: Handler completed');
          break;
        default:
          log.error({ objectType: event.object_type }, 'Unhandled event type');
          throw new Error(`Evento não tratado: ${event.object_type}`);
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      const log = getLogger(req.headers['x-request-id'] as string);
      log.error({ err: error }, 'Erro ao processar webhook');
      if (replayKey) {
        try {
          await redis.del(replayKey);
        } catch (clearError) {
          log.error(
            { err: clearError },
            'Erro ao remover marcador de replay após falha do webhook',
          );
        }
      }
      try {
        const emailEnv = getEmailServerEnv();
        if (!emailEnv.success) {
          throw new Error('Missing email configuration');
        }
        // O endpoint resolve assunto, destinatário e HTML a partir do
        // template (VULN-009): aqui só vão params planos — o `Error` é
        // serializado antes, porque ele não sobrevive ao JSON.
        // Efeito colateral do 500, não parte da resposta: disparado sem
        // await (async-defer-await) — um SMTP lento não segurava o retorno.
        // `Promise.resolve` tolera o mock de teste que devolve undefined;
        // a falha segue para o mesmo log do catch abaixo.
        void Promise.resolve(
          sendEmail({
            template: 'webhook-error',
            params: {
              message: 'Erro no Processamento do Webhook',
              errorDetail:
                error instanceof Error ? error.message : String(error),
              stack: error instanceof Error && error.stack ? error.stack : '',
            },
          }),
        ).catch((emailError) => {
          log.error({ err: emailError }, 'Erro ao enviar email de erro');
        });
      } catch (emailError) {
        log.error({ err: emailError }, 'Erro ao enviar email de erro');
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  // Métodos não permitidos
  return res.status(405).end();
}

async function handleActivityEvent(event: StravaWebhookEvent, log: Logger) {
  try {
    const { object_id: activityId, owner_id: athleteId, aspect_type } = event;
    log.info(
      { athleteId, activityId, aspectType: aspect_type },
      'Processando evento de atividade',
    );

    // Checagem barata síncrona antes de qualquer I/O: sem ela, o token era
    // buscado (Redis + refresh potencial) só para descobrir que falta config.
    if (!getStravaServerEnv().success) {
      throw new Error('Missing Strava API configuration');
    }

    // Token do atleta e base de atividades não se dependem — disparados juntos.
    const [tokens, storedActivities] = await Promise.all([
      getAthleteAccessToken(athleteId),
      apiRemoteStorage.get(REDIS_KEYS.activities(athleteId)),
    ]);
    if (!tokens?.accessToken || !tokens.refreshToken) {
      throw new Error(`Token não encontrado para athlete ${athleteId}`);
    }
    const { accessToken, refreshToken } = tokens;

    if (!accessToken) {
      const errorContext: WebhookErrorContext = {
        message: 'Token não encontrado',
        error: `Nenhum token disponível para athlete ${athleteId}`,
        eventType: 'activity',
        athleteId,
        objectId: activityId,
        activityUrl: `https://www.strava.com/activities/${activityId}`,
      };
      log.error({ athleteId }, 'Token não encontrado para atleta');
      try {
        // await sendEmail({
        //   template: 'webhook-error',
        //   params: {
        //     message: 'Token não encontrado',
        //     errorDetail: `Athlete ${athleteId} sem token`,
        //     stack: '',
        //     eventType: 'activity',
        //     athleteId,
        //     objectId: activityId,
        //     activityUrl: `https://www.strava.com/activities/${activityId}`,
        //   },
        // });
        log.error(
          { err: new Error(`Athlete ${athleteId} sem token`) },
          `Token não encontrado para atleta ${athleteId}`,
        );
      } catch (emailError) {
        log.error(
          { err: emailError },
          'Erro ao enviar email de token não encontrado',
        );
      }
      return;
    }

    const strava = createStravaClient(
      { refreshToken },
      { context: 'webhook.activity', athleteId },
    );
    if (!strava) {
      throw new Error('Missing Strava API configuration');
    }

    const hasStored =
      storedActivities &&
      storedActivities.data &&
      Object.keys(storedActivities.data).length !== 0;

    if (!hasStored) {
      // First-time sync: process the single activity (if present) and then build stats
      log.info(
        { athleteId, activityId, aspect_type },
        'No stored activities: handling initial sync',
      );
      if (aspect_type === 'create' || aspect_type === 'update') {
        const activity = await fetchStravaActivity(activityId, strava);
        const updated = await processActivity(activity, athleteId);
        if (updated === null) {
          throw new Error(`Failed to persist activity ${activityId}`);
        }
      }
      await updateStatistics(strava, athleteId, { forceRecompute: true });
    } else {
      const { lastUpdated, activities } = storedActivities.data;

      if (aspect_type === 'update') {
        log.info({ athleteId, activityId }, 'Updating existing activity');
        const activity = await fetchStravaActivity(activityId, strava);
        const updated = await processActivity(activity, athleteId);
        if (updated === null) {
          throw new Error(`Failed to persist activity ${activityId}`);
        }
      } else if (aspect_type === 'create') {
        log.info(
          { athleteId, activityId },
          'Processing new activity and merging with stored list',
        );
        const athlete = await getAthlete(strava, athleteId);
        const gears = getGears(athlete);

        const activitiesFromStravaAPI = await getActivities(
          strava,
          gears,
          null,
          lastUpdated,
        );

        // Merge and dedupe, preferring newest start_date_local — sob o lock
        // de escrita (design 2026-11-18, item 2): a base é relida dentro da
        // seção crítica, porque o read lá em cima (p/ lastUpdated) pode estar
        // minutos velho atrás do fetch e o write apagaria o que foi gravado
        // nesse meio-tempo (lost update).
        await withActivitiesWriteLock(athleteId, (current) =>
          mergeActivities(activitiesFromStravaAPI, current),
        );
      } else if (aspect_type === 'delete') {
        log.info(
          { athleteId, activityId },
          'Activity deleted - removing from storage and updating statistics',
        );
        try {
          await withActivitiesWriteLock(athleteId, (current) =>
            current.filter((a) => a.id !== activityId),
          );
        } catch (e) {
          log.error(
            { err: e, athleteId, activityId },
            'Error removing deleted activity from storage',
          );
          throw e;
        }
      }

      await updateStatistics(strava, athleteId, { forceRecompute: true });
    }
  } catch (error) {
    log.error({ err: error, event }, 'Erro ao processar evento de atividade');
    try {
      const errorContext: WebhookErrorContext = {
        message: 'Erro ao processar evento de atividade',
        error,
        eventType: event.aspect_type,
        athleteId: event.owner_id,
        objectId: event.object_id,
        activityUrl: `https://www.strava.com/activities/${event.object_id}`,
      };
      // await sendEmail({
      //   template: 'webhook-error',
      //   params: {
      //     message: 'Erro ao processar evento de atividade',
      //     errorDetail:
      //       error instanceof Error ? error.message : String(error),
      //     stack: error instanceof Error && error.stack ? error.stack : '',
      //     eventType: event.aspect_type,
      //     athleteId: event.owner_id,
      //     objectId: event.object_id,
      //     activityUrl: `https://www.strava.com/activities/${event.object_id}`,
      //   },
      // });
      log.error(
        { err: new Error(`Erro ao processar atividade ${event.object_id}`) },
        `Erro ao processar atividade ${event.object_id}`,
      );
    } catch (emailError) {
      log.error(
        { err: emailError },
        'Erro ao enviar email após falha em processamento de atividade',
      );
    }
    throw error;
  }
}

async function handleAthleteEvent(event: StravaWebhookEvent, log: Logger) {
  const { owner_id: athleteId, aspect_type } = event;
  log.info({ athleteId, aspectType: aspect_type }, 'Evento de atleta recebido');

  switch (aspect_type) {
    case 'update': {
      try {
        // Guard barato síncrono antes do I/O de token (async-cheap-condition).
        if (!getStravaServerEnv().success) {
          throw new Error('Missing Strava API configuration');
        }
        const tokens = await getAthleteAccessToken(athleteId);
        if (!tokens?.refreshToken) {
          log.warn({ athleteId }, 'Athlete update ignored: missing tokens');
          return;
        }

        const strava = createStravaClient(
          { refreshToken: tokens.refreshToken },
          { context: 'webhook.athlete', athleteId },
        );
        if (!strava) {
          throw new Error('Missing Strava API configuration');
        }

        await updateStatistics(strava, athleteId);
        log.info({ athleteId }, 'Athlete update processed');
      } catch (error) {
        log.error({ err: error, athleteId }, 'Failed to process athlete update');
      }
      break;
    }
    case 'delete': {
      try {
        // LGPD (design 2026-11-18, item 4): espera o voo de estatísticas
        // em andamento liberar a lock (teto 10s) antes de apagar — um
        // recompute ao vivo recriaria as chaves logo depois do delete.
        // Passou o teto (rebuild longo), apaga mesmo assim: a guarda
        // athleteStillExists em toda gravação impede a ressurreição.
        const statisticsLock = REDIS_KEYS.statisticsLock(athleteId);
        const waitStart = Date.now();
        while (
          (await redis.get(statisticsLock)) &&
          Date.now() - waitStart < 10_000
        ) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        await redis.del(
          REDIS_KEYS.auth(athleteId),
          REDIS_KEYS.activities(athleteId),
          REDIS_KEYS.statistics(athleteId),
          REDIS_KEYS.refreshLock(athleteId),
          // D14: relatório de códigos não reconhecidos — dado derivado da
          // observação privada sai junto (LGPD).
          REDIS_KEYS.unrecognizedCodes(athleteId),
          // Locks também: segurar uma lock de dado apagado só atrasa a
          // próxima gravação legítima (a guarda de auth já segura).
          statisticsLock,
          REDIS_KEYS.activitiesLock(athleteId),
        );
        log.info({ athleteId }, 'Athlete data deleted from storage');
      } catch (error) {
        log.error({ err: error, athleteId }, 'Failed to delete athlete data');
      }
      break;
    }
    default:
      log.warn(
        { athleteId, aspectType: aspect_type },
        'Tipo de evento de atleta não tratado',
      );
  }
}
