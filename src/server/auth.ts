import type { NextApiRequest } from 'next';

function getAuthenticatedAthleteId(req: NextApiRequest): number | null {
  const athleteIdRaw = req.cookies?.strava_athleteId;
  const athleteId = Number(athleteIdRaw);

  if (!athleteIdRaw || !Number.isFinite(athleteId) || athleteId <= 0) {
    return null;
  }

  return athleteId;
}

export { getAuthenticatedAthleteId };
