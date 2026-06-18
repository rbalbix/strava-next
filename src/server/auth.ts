import type { NextApiRequest, NextApiResponse } from 'next';

export type AuthenticatedNextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  athleteId: number
) => void | Promise<void>;

function getAuthenticatedAthleteId(req: NextApiRequest): number | null {
  const athleteIdRaw = req.cookies?.strava_athleteId;
  const athleteId = Number(athleteIdRaw);

  if (!athleteIdRaw || !Number.isFinite(athleteId) || athleteId <= 0) {
    return null;
  }

  return athleteId;
}

export function withProtectedAPI(handler: AuthenticatedNextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const athleteId = getAuthenticatedAthleteId(req);

    if (!athleteId) {
      return res.status(401).json({ error: 'Unauthorized', reason: 'Session expired or invalid' });
    }

    return handler(req, res, athleteId);
  };
}

export { getAuthenticatedAthleteId };
