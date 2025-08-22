import type { NextApiRequest, NextApiResponse } from 'next';
import { Strava } from 'strava';
import { getAthleteAccessToken } from '../../services/strava-auth';
import { fetchStravaActivity } from '../../services/strava-api';

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

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
  res: NextApiResponse
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
    const verifyToken = process.env.VERIFY_TOKEN;
    if (req.query['hub.verify_token'] === verifyToken) {
      return res
        .status(200)
        .json({ 'hub.challenge': req.query['hub.challenge'] });
    }

    try {
      const event = req.body as StravaWebhookEvent;
      console.log(`📩 Webhook recebido: `, event);

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
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('Erro no webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Métodos não permitidos
  return res.status(405).end();
}

async function handleActivityEvent(event: any) {
  const { object_id: activityId, owner_id: athleteId, aspect_type } = event;

  console.log(
    `🎯 Activity ${aspect_type}: ${activityId} by athlete ${athleteId}`
  );

  // Buscar access token do atleta
  const accessToken = await getAthleteAccessToken(athleteId);

  console.log('Access token: ', accessToken);

  if (!accessToken) {
    console.error(`❌ Token não encontrado para athlete ${athleteId}`);
    return;
  }

  // Buscar atividade completa
  try {
    const activity = await fetchStravaActivity(activityId, accessToken);
    console.log('✅ Atividade recuperada:', activity.name);

    // 9. Processar a atividade (salvar no DB, cache, etc.)
    // await processActivity(activity, athleteId);
  } catch (error) {
    console.error(`❌ Erro ao buscar atividade ${activityId}:`, error);
  }
}

async function handleAthleteEvent(event: StravaWebhookEvent) {
  // Lógica para eventos relacionados ao atleta
  console.log('Evento de atleta recebido:', event);
}

// Função auxiliar para atualizar cache
function updateActivityCache(
  activityId: number,
  action: 'create' | 'update' | 'delete'
) {
  // Implemente sua lógica de cache aqui
  console.log(
    `Atividade ${activityId} ${action === 'delete' ? 'removida' : 'atualizada'}`
  );
}
