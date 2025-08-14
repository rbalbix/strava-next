import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID as string;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET as string;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN as string;
const CALLBACK_URL = process.env.CALLBACK_URL as string;

interface StravaWebhookEvent {
  aspect_type: 'create' | 'update' | 'delete';
  event_time: number;
  object_id: number;
  object_type: 'activity' | 'athlete';
  owner_id: number;
  subscription_id: number;
  updates?: Record<string, unknown>;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook validado com sucesso!');
      return res.status(200).json({ 'hub.challenge': challenge });
    } else {
      return res.status(403).json({ message: 'Token inválido' });
    }
  }

  if (req.method === 'POST') {
    const evento = req.body as StravaWebhookEvent;
    console.log('📩 Evento recebido:', evento);

    // Aqui você pode salvar o evento no banco, processar, etc.
    return res.status(200).send('OK');
  }
}
