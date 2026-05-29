import { NextApiRequest, NextApiResponse } from 'next';
import { clearHttpOnlyCookie } from '../../server/cookies';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  res.setHeader('Set-Cookie', [
    clearHttpOnlyCookie('strava_code'),
    clearHttpOnlyCookie('strava_athleteId'),
    clearHttpOnlyCookie('strava_oauth_state', 'Lax'),
  ]);

  return res.status(200).json({ success: true });
}
