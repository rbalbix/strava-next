import type { NextApiRequest, NextApiResponse } from 'next';
import { Strava } from 'strava';
import { REDIS_KEYS } from '../../config';
import redis from '../../services/redis';
import { getLogger } from '../../services/logger';
import {
  fetchStravaActivity,
  getActivities,
  processActivities,
  processActivity,
} from '../../services/activity';
import { apiRemoteStorage } from '../../services/api';
import { getAthlete } from '../../services/athlete';
import { createErrorEmailTemplate, sendEmail } from '../../services/email';
import { getGears } from '../../services/gear';
import { updateStatistics } from '../../services/statistics';
import { getAthleteAccessToken } from '../../services/strava-auth';

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
interface StravaWebhookEvent {
  aspect_type: 'create' | 'update' | 'delete';
  event_time: number;
  object_id: number;
  object_type: 'activity' | 'athlete';
  owner_id: number;
  subscription_id: number;
  updates?: Record<string, unknown>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Validação do webhook (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook validado');
      return res.status(200).json({ 'hub.challenge': challenge });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }

  // Processamento de eventos (POST)
  if (req.method === 'POST') {
    // Reject attempts to use the verification query on POST (verification is GET-only)
    if (req.query['hub.verify_token']) {
      return res.status(400).json({ error: 'Invalid method for verification' });
    }

    try {
      const event = req.body as StravaWebhookEvent;
      const log = getLogger(req.headers['x-request-id'] as string);
      log.info({ event }, 'Webhook recebido');

      // Basic payload validation
      if (!event || !event.object_type || !event.object_id || !event.owner_id) {
        log.warn({ event }, 'Webhook payload inválido');
        return res.status(400).json({ error: 'Invalid payload' });
      }

      // Deduplicate events: set processed key with NX and short TTL
      try {
        const processedKey = REDIS_KEYS.processedEvent(
          event.owner_id,
          event.object_id,
          event.aspect_type,
        );
        const set = await redis.set(processedKey, '1', {
          nx: true,
          ex: 24 * 3600,
        });
        if (!set) {
          log.info({ processedKey }, 'Evento já processado, ignorando');
          return res.status(200).json({ received: true, deduped: true });
        }
      } catch (e) {
        log.error({ err: e }, 'Erro ao marcar evento processado');
        // continue processing — dedupe best-effort
      }

      // Processar diferentes tipos de eventos
      switch (event.object_type) {
        case 'activity':
          await handleActivityEvent(event);
          break;
        case 'athlete':
          await handleAthleteEvent(event);
          break;
        default:
          console.log('Evento não tratado:', event.object_type);
          throw new Error(`Evento não tratado: ${event.object_type}`);
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('Erro no webhook:', error);
      await sendEmail({
        to: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
        subject: `[Stuff Stats] - Erro`,
        html: createErrorEmailTemplate('Erro no Webhook', error),
        from: process.env.RESEND_EMAIL_FROM,
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  // Métodos não permitidos
  return res.status(405).end();
}

async function handleActivityEvent(event: StravaWebhookEvent) {
  try {
    const { object_id: activityId, owner_id: athleteId } = event;

    // Buscar access token do atleta
    const { accessToken, refreshToken } =
      await getAthleteAccessToken(athleteId);

    if (!accessToken) {
      // await sendEmail({
      //   to: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
      //   subject: `[Stuff Stats] - Erro`,
      //   html: createErrorEmailTemplate(
      //     `❌ Token não encontrado para athlete ${athleteId}`,
      //     ''
      //   ),
      //   from: process.env.RESEND_EMAIL_FROM,
      // });
      console.error(`❌ Token não encontrado para athlete ${athleteId}`);
      return;
    }

    const storedActivities = await apiRemoteStorage.get(
      REDIS_KEYS.activities(athleteId),
    );

    const strava = new Strava({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    if (
      !storedActivities.data ||
      storedActivities.data === null ||
      storedActivities.data === undefined ||
      Object.keys(storedActivities.data).length === 0
    ) {
      await updateStatistics(strava, athleteId);
    } else {
      if (event.aspect_type === 'update') {
        // Buscar e processar atividade completa
        const activity = await fetchStravaActivity(activityId, strava);
        await processActivity(activity, athleteId);
      } else if (event.aspect_type === 'create') {
        // Recupera apenas as atividades criadas depois de lastUpdated
        const athlete = await getAthlete(strava);
        const gears = getGears(athlete);
        const { lastUpdated, activities } = storedActivities.data;

        const activitiesFromStravaAPI = await getActivities(
          strava,
          gears,
          null,
          lastUpdated,
        );

        await processActivities(athleteId, [
          ...activitiesFromStravaAPI,
          ...activities,
        ]);
      }
      await updateStatistics(strava, athleteId);
    }
  } catch (error) {
    // await sendEmail({
    //   to: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
    //   subject: `[Stuff Stats] - Erro`,
    //   html: createErrorEmailTemplate(
    //     `❌ Erro ao processar o evento ${event} - Atividade: https://www.strava.com/activities/${event.object_id}`,
    //     error
    //   ),
    //   from: process.env.RESEND_EMAIL_FROM,
    // });
    console.error(
      `❌ Erro ao processar o evento para a atividade ${event.object_id}:`,
      error,
    );
  }
}

async function handleAthleteEvent(event: StravaWebhookEvent) {
  // Lógica para eventos relacionados ao atleta
  console.log('Evento de atleta recebido:', event);
}
