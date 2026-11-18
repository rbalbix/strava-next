import type { NextApiResponse } from 'next';
import type { DashboardResponse } from '../../contracts/api';
import { withProtectedAPI, respondIfSessionMissing } from '../../server/auth';
import { getStravaServerEnv } from '../../server/env';
import { createStravaClient } from '../../server/strava-client';
import { getAthlete, getAthleteStats } from '../../services/athlete';
import { verifyIfHasAnyActivities } from '../../services/activity';
import { verifyIfHasAnyGears } from '../../services/gear';
import { getLogger } from '../../services/logger';
import { updateStatistics } from '../../services/statistics';
import { getAthleteAccessToken } from '../../services/strava-auth';
import { getEquipmentThresholds } from '../../services/thresholds';
import { getUnrecognizedCodes } from '../../services/unrecognized-codes';
import { getStravaErrorDetails } from '../../services/strava-sdk';
import { secondsToNextStravaWindow } from '../../services/rate-limit';
import type { AuthenticatedNextApiHandler } from '../../server/auth';

const handler: AuthenticatedNextApiHandler = async (
  req,
  res,
  athleteId,
) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tokens = await getAthleteAccessToken(athleteId);
    if (!tokens?.accessToken || !tokens?.refreshToken || !tokens?.expiresAt) {
      return res.status(401).json({ error: 'Missing auth tokens' });
    }
    if (!getStravaServerEnv().success) {
      return res.status(500).json({ error: 'Server auth config missing' });
    }

    const strava = createStravaClient(tokens, {
      context: 'dashboard',
      athleteId,
    });
    if (!strava) {
      return res.status(500).json({ error: 'Server auth config missing' });
    }

    // Cache baseline de 60s: sem o athleteId aqui o cache é bypassado e todo
    // poll paga 1 chamada Strava só para ler o perfil (erro real observado em
    // produção: 429 morrendo exatamente neste `getAthlete`).
    const athlete = await getAthlete(strava, athleteId);
    const athleteStats = await getAthleteStats(strava, athlete);
    const hasGear = verifyIfHasAnyGears(athlete);
    const hasActivities = await verifyIfHasAnyActivities(strava, athlete);
    const gearStats =
      hasGear && hasActivities
        ? await updateStatistics(strava, athlete.id)
        : [];

    const response: DashboardResponse = {
      athlete,
      athleteStats,
      hasGear,
      hasActivities,
      gearStats,
    };

    try {
      const equipmentThresholds = await getEquipmentThresholds(athleteId);
      response.equipmentThresholds = equipmentThresholds;
    } catch (error) {
      getLogger().error({ err: error }, 'Failed to load equipment thresholds');
    }

    // D14: relatório de códigos não reconhecidos — leitura best-effort,
    // mesmo molde dos thresholds; falha responde sem o campo e o banner
    // simplesmente não aparece nesta abertura.
    if (hasGear && hasActivities) {
      try {
        const unrecognizedCodes = await getUnrecognizedCodes(athleteId);
        if (unrecognizedCodes && unrecognizedCodes.length > 0) {
          response.unrecognizedCodes = unrecognizedCodes;
        }
      } catch (error) {
        getLogger().error(
          { err: error },
          'Failed to load unrecognized codes report',
        );
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    // Sem sessão no Redis ≠ erro do servidor: responde 401 para que o cliente
    // encerre a sessão e volte para a landing. Antes, tudo virava 500 e o
    // usuário ficava preso num painel de erro genérico para sempre.
    if (respondIfSessionMissing(res, error)) {
      return;
    }

    // 429 do Strava ≠ erro interno: esgotou a janela de leitura (100 req/15min
    // por aplicativo). Responde com o status real + quanto falta para o reset
    // (janelas às :00/:15/:30/:45), para o cliente não entrar em loop de retry
    // esquentando a mesma janela — em 429 o `useAutoSync` não faz retry
    // automático nem revalida ao focar a aba.
    const { status: stravaStatus } = getStravaErrorDetails(error);
    if (stravaStatus === 429) {
      const retryAfterSeconds = secondsToNextStravaWindow();
      getLogger().warn(
        { err: error, athleteId, retryAfterSeconds },
        'Strava rate limit no dashboard',
      );
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res
        .status(429)
        .json({ error: 'Strava rate limit', retryAfterSeconds });
    }

    getLogger().error({ err: error }, 'Dashboard endpoint failed');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default withProtectedAPI(handler);
