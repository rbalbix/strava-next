import type { NextApiRequest, NextApiResponse } from 'next';
import { Strava } from 'strava';
import { getAthlete, getAthleteStats } from '../../services/athlete';
import { verifyIfHasAnyActivities } from '../../services/activity';
import { verifyIfHasAnyGears } from '../../services/gear';
import { getLogger } from '../../services/logger';
import { updateStatistics } from '../../services/statistics';
import { getAthleteAccessToken } from '../../services/strava-auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const athleteIdRaw = req.cookies?.strava_athleteId;
    const athleteId = Number(athleteIdRaw);

    if (!athleteIdRaw || !Number.isFinite(athleteId) || athleteId <= 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokens = await getAthleteAccessToken(athleteId);
    if (!tokens?.accessToken || !tokens?.refreshToken || !tokens?.expiresAt) {
      return res.status(401).json({ error: 'Missing auth tokens' });
    }

    const strava = new Strava(
      {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: tokens.refreshToken,
      },
      {
        access_token: tokens.accessToken,
        expires_at: tokens.expiresAt,
        refresh_token: tokens.refreshToken,
      },
    );

    const athlete = await getAthlete(strava);
    const athleteStats = await getAthleteStats(strava, athlete);
    const hasGear = verifyIfHasAnyGears(athlete);
    const hasActivities = await verifyIfHasAnyActivities(strava, athlete);
    const gearStats =
      hasGear && hasActivities ? await updateStatistics(strava, athlete.id) : [];

    return res.status(200).json({
      athlete,
      athleteStats,
      hasGear,
      hasActivities,
      gearStats,
    });
  } catch (error) {
    getLogger().error({ err: error }, 'Dashboard endpoint failed');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
