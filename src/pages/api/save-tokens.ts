import { NextApiRequest, NextApiResponse } from 'next';
import { saveStravaAuth } from '../../services/strava-auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Validar dados da requisição
    const { athleteId, refreshToken, accessToken, expiresAt, athleteInfo } =
      req.body;

    if (!athleteId || !refreshToken || !accessToken || !expiresAt) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    console.log(`💾 Salvando tokens para athlete ${athleteId}`);

    // Salvar no Redis (lado servidor)
    await saveStravaAuth(
      athleteId,
      refreshToken,
      accessToken,
      expiresAt,
      athleteInfo
    );

    res.status(200).json({
      success: true,
      message: 'Tokens salvos com sucesso',
    });
  } catch (error) {
    console.error('Erro ao salvar tokens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
