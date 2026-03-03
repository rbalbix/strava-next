import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { hasValidInternalApiKey } from '../../services/internal-api-auth';
import { saveStravaAuth } from '../../services/strava-auth';
import { getLogger } from '../../services/logger';

const SaveTokensSchema = z
  .object({
    athleteId: z.number().int().positive(),
    refreshToken: z.string().min(1),
    accessToken: z.string().min(1),
    expiresAt: z.number().int().positive(),
    athleteInfo: z.unknown().optional(),
  })
  .strict();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const log = getLogger(req.headers['x-request-id'] as string);

  if (!hasValidInternalApiKey(req)) {
    log.warn({ method: req.method }, 'Unauthorized request to save-tokens');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Permitir apenas POST
  if (req.method !== 'POST') {
    log.warn({ method: req.method }, 'Method not allowed on save-tokens');
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const parsed = SaveTokensSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn({ issues: parsed.error.issues }, 'Invalid token payload');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const { athleteId, refreshToken, accessToken, expiresAt, athleteInfo } =
      parsed.data;

    log.info(
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
    log.info({ athleteId }, 'Tokens saved successfully');
  } catch (error) {
    log.error({ err: error }, 'Erro ao salvar tokens');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
