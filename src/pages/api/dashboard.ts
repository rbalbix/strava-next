import type { NextApiRequest, NextApiResponse } from 'next';
import type { DashboardResponse } from '../../contracts/api';
import { getAuthenticatedAthleteId } from '../../server/auth';
import { getStravaServerEnv } from '../../server/env';
import { createStravaClient } from '../../server/strava-client';
import { getAthlete, getAthleteStats } from '../../services/athlete';
import { verifyIfHasAnyActivities } from '../../services/activity';
import { verifyIfHasAnyGears } from '../../services/gear';
import { getLogger } from '../../services/logger';
import { updateStatistics } from '../../services/statistics';
import { getAthleteAccessToken } from '../../services/strava-auth';
import { getEquipmentThresholds } from '../../services/thresholds';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const athleteId = getAuthenticatedAthleteId(req);
    if (!athleteId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokens = await getAthleteAccessToken(athleteId);
    if (!tokens?.accessToken || !tokens?.refreshToken || !tokens?.expiresAt) {
      return res.status(401).json({ error: 'Missing auth tokens' });
    }
    if (!getStravaServerEnv().success) {
      return res.status(500).json({ error: 'Server auth config missing' });
    }

    const strava = createStravaClient(tokens);
    if (!strava) {
      return res.status(500).json({ error: 'Server auth config missing' });
    }

    const athlete = await getAthlete(strava);
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

    return res.status(200).json(response);
  } catch (error) {
    getLogger().error({ err: error }, 'Dashboard endpoint failed');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
