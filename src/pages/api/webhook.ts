import type { NextApiRequest, NextApiResponse } from 'next';
import { Strava } from 'strava';

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
  // 1. Validação do webhook (GET)
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

  // 2. Processamento de eventos (POST)
  if (req.method === 'POST') {
    try {
      const event = req.body as StravaWebhookEvent;
      console.log(
        `📩 Evento recebido (${event.aspect_type}):`,
        event.object_id
      );

      // 3. Processar diferentes tipos de eventos
      switch (event.object_type) {
        case 'activity':
          await handleActivityEvent(event);
          break;
        case 'athlete':
          await handleAthleteEvent(event);
          break;
      }

      return res.status(200).json({ status: 'processed' });
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 4. Métodos não permitidos
  return res.status(405).end();
}

// Funções de tratamento de eventos
async function handleActivityEvent(event: StravaWebhookEvent) {
  const strava = new Strava({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: '',
  });

  // Buscar detalhes da atividade se for criação/atualização
  if (event.aspect_type !== 'delete') {
    const activity = await strava.activities.getActivityById({
      id: event.object_id,
      include_all_efforts: false,
    });

    console.log('Detalhes da atividade:', activity.name);

    // Aqui você pode:
    // - Atualizar seu banco de dados
    // - Enviar notificações
    // - Processar mudanças
  }

  // Implemente sua lógica de negócios aqui
  // Exemplo: atualizar cache de atividades
  updateActivityCache(event.object_id, event.aspect_type);
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
