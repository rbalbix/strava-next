import { NextApiRequest, NextApiResponse } from 'next';
import { hasValidInternalApiKey } from '../../services/internal-api-auth';
import { saveStravaAuth } from '../../services/strava-auth';
import { getLogger } from '../../services/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!hasValidInternalApiKey(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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

    getLogger().info(
      { athleteId },
      `Salvando tokens para athlete ${athleteId}`,
    );

    // Salvar no Redis (lado servidor)
    await saveStravaAuth(
      athleteId,
      refreshToken,
      accessToken,
      expiresAt,
      athleteInfo,
    );

    res.status(200).json({
      success: true,
      message: 'Tokens salvos com sucesso',
    });
  } catch (error) {
    getLogger().error({ err: error }, 'Erro ao salvar tokens');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
