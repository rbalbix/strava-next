import { NextApiRequest, NextApiResponse } from 'next';
import {
  clearHttpOnlyCookie,
  getCookieValue,
  serializeHttpOnlyCookie,
} from '../../server/cookies';
import { getStravaOAuthTokenEnv } from '../../server/env';
import { apiStravaAuth, apiStravaOauthToken } from '../../services/api';
import { getLogger } from '../../services/logger';

export default async function Authorize(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { code, state } = req.query;
  const cookieHeader = req.headers.cookie || '';
  const storedState = getCookieValue(cookieHeader, 'strava_oauth_state');

  if (!code || typeof code !== 'string') {
    return res
      .status(400)
      .json({ error: 'Code parameter is missing or invalid' });
  }
  if (!state || typeof state !== 'string' || !storedState || state !== storedState) {
    res.setHeader(
      'Set-Cookie',
      clearHttpOnlyCookie('strava_oauth_state', 'Lax'),
    );
    return res.status(400).json({ error: 'Invalid OAuth state' });
  }

  try {
    const log = getLogger(req.headers['x-request-id'] as string);
    const env = getStravaOAuthTokenEnv();
    if (!env.success) {
      log.error({ issues: env.error.issues }, 'Missing Strava OAuth config');
      return res.status(500).json({ error: 'Server auth config missing' });
    }

    const response = await apiStravaOauthToken.post('', null, {
      params: {
        client_id: env.data.CLIENT_ID,
        client_secret: env.data.CLIENT_SECRET,
        code,
        grant_type: env.data.GRANT_TYPE,
      },
    });

    const { access_token, refresh_token, expires_at, athlete } = response.data;

    res.setHeader('Set-Cookie', [
      serializeHttpOnlyCookie('strava_code', code, { maxAge: 300, sameSite: 'Lax' }),
      serializeHttpOnlyCookie('strava_athleteId', String(athlete.id), {
        maxAge: 300,
        sameSite: 'Lax',
      }),
      clearHttpOnlyCookie('strava_oauth_state', 'Lax'),
    ]);

    await apiStravaAuth.post('/', {
      athleteId: athlete.id,
      refreshToken: refresh_token,
      accessToken: access_token,
      expiresAt: expires_at,
      athleteInfo: athlete,
    });

    res.redirect('/');
  } catch (error) {
    const log = getLogger(req.headers['x-request-id'] as string);
    log.error({ err: error }, 'Authorize route failed');

    res.redirect(`/404`);
  }
}
