import type { NextApiRequest, NextApiResponse } from 'next';
import type { Logger } from 'pino';
import { Strava } from 'strava';
import { REDIS_KEYS } from '../../config';
import {
  ActivityBase,
  fetchStravaActivity,
  getActivities,
  processActivities,
  processActivity,
} from '../../services/activity';
import { apiRemoteStorage } from '../../services/api';
import { getAthlete } from '../../services/athlete';
import {
  createErrorEmailTemplate,
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
const WEBHOOK_RATE_LIMIT_MAX_PER_MINUTE = 60;
const WEBHOOK_REPLAY_TTL_SECONDS = 2 * 60 * 60; // 2 hours

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

async function guardWebhookReplay(event: StravaWebhookEvent): Promise<boolean> {
  const replayKey = `strava:webhook:seen:${event.owner_id}:${event.object_type}:${event.object_id}:${event.aspect_type}:${event.event_time}`;
  const inserted = await redis.set(replayKey, '1', {
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
    // Reject attempts to use the verification query on POST (verification is GET-only)
    if (req.query['hub.verify_token']) {
      return res.status(400).json({ error: 'Invalid method for verification' });
    }

    try {
      const log = getLogger(req.headers['x-request-id'] as string);
      log.info(
        {
          contentType: req.headers['content-type'],
          contentLength: req.headers['content-length'],
        },
        'Webhook recebido',
      );

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
          await handleActivityEvent(event, log);
          break;
        case 'athlete':
          await handleAthleteEvent(event, log);
          break;
        default:
          log.error({ objectType: event.object_type }, 'Unhandled event type');
          throw new Error(`Evento não tratado: ${event.object_type}`);
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      const log = getLogger(req.headers['x-request-id'] as string);
      log.error({ err: error }, 'Erro ao processar webhook');
      try {
        const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
        const resendFrom = process.env.RESEND_EMAIL_FROM;
        if (!contactEmail || !resendFrom) {
          throw new Error('Missing email configuration');
        }
        await sendEmail({
          to: contactEmail,
          subject: `[Stuff Stats] - Erro no Webhook`,
          html: createErrorEmailTemplate(
            'Erro no Processamento do Webhook',
            error,
          ),
          from: resendFrom,
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

    // Buscar access token do atleta
    const tokens = await getAthleteAccessToken(athleteId);
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
        //   to: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
        //   subject: `[Stuff Stats] - Token não encontrado para atleta ${athleteId}`,
        //   html: createErrorEmailTemplate(
        //     'Token não encontrado',
        //     new Error(`Athlete ${athleteId} sem token`),
        //     errorContext,
        //   ),
        //   from: process.env.RESEND_EMAIL_FROM,
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

    const storedActivities = await apiRemoteStorage.get(
      REDIS_KEYS.activities(athleteId),
    );

    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
      throw new Error('Missing Strava API configuration');
    }

    const strava = new Strava({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token: refreshToken,
    });

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
        try {
          const activity = await fetchStravaActivity(activityId, strava);
          await processActivity(activity, athleteId);
        } catch (e) {
          log.warn(
            { err: e, athleteId, activityId },
            'Failed to fetch/process single activity during initial sync',
          );
        }
      }
      await updateStatistics(strava, athleteId);
    } else {
      const { lastUpdated, activities } = storedActivities.data;

      if (aspect_type === 'update') {
        log.info({ athleteId, activityId }, 'Updating existing activity');
        const activity = await fetchStravaActivity(activityId, strava);
        await processActivity(activity, athleteId);
      } else if (aspect_type === 'create') {
        log.info(
          { athleteId, activityId },
          'Processing new activity and merging with stored list',
        );
        const athlete = await getAthlete(strava);
        const gears = getGears(athlete);

        const activitiesFromStravaAPI = await getActivities(
          strava,
          gears,
          null,
          lastUpdated,
        );

        // Merge and dedupe, preferring newest start_date_local
        const merged = mergeActivities(
          activitiesFromStravaAPI,
          activities || [],
        );
        await processActivities(athleteId, merged);
      } else if (aspect_type === 'delete') {
        log.info(
          { athleteId, activityId },
          'Activity deleted - removing from storage and updating statistics',
        );
        try {
          const existing: ActivityBase[] = activities || [];
          const filtered = existing.filter((a) => a.id !== activityId);
          await processActivities(athleteId, filtered);
        } catch (e) {
          log.error(
            { err: e, athleteId, activityId },
            'Error removing deleted activity from storage',
          );
        }
      }

      await updateStatistics(strava, athleteId);
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
      //   to: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
      //   subject: `[Stuff Stats] - Erro ao processar atividade ${event.object_id}`,
      //   html: createErrorEmailTemplate(
      //     'Erro ao processar evento de atividade',
      //     error,
      //     errorContext,
      //   ),
      //   from: process.env.RESEND_EMAIL_FROM,
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
  }
}

async function handleAthleteEvent(event: StravaWebhookEvent, log: Logger) {
  const { owner_id: athleteId, aspect_type } = event;
  log.info({ athleteId, aspectType: aspect_type }, 'Evento de atleta recebido');

  switch (aspect_type) {
    case 'update': {
      try {
        const tokens = await getAthleteAccessToken(athleteId);
        if (!tokens?.refreshToken) {
          log.warn({ athleteId }, 'Athlete update ignored: missing tokens');
          return;
        }
        if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
          throw new Error('Missing Strava API configuration');
        }

        const strava = new Strava({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          refresh_token: tokens.refreshToken,
        });

        await updateStatistics(strava, athleteId);
        log.info({ athleteId }, 'Athlete update processed');
      } catch (error) {
        log.error({ err: error, athleteId }, 'Failed to process athlete update');
      }
      break;
    }
    case 'delete': {
      try {
        await redis.del(
          REDIS_KEYS.auth(athleteId),
          REDIS_KEYS.activities(athleteId),
          REDIS_KEYS.statistics(athleteId),
          REDIS_KEYS.refreshLock(athleteId),
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
