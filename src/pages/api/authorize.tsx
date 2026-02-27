import { NextApiRequest, NextApiResponse } from 'next';
import { apiStravaAuth, apiStravaOauthToken } from '../../services/api';
import { getLogger } from '../../services/logger';

function getCookieValue(cookieHeader: string, key: string): string | null {
  const cookie = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith(`${key}=`));
  if (!cookie) return null;
  return cookie.split('=').slice(1).join('=');
}

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
    const isProd = process.env.NODE_ENV === 'production';
    const secureFlag = isProd ? 'Secure; ' : '';
    res.setHeader(
      'Set-Cookie',
      `strava_oauth_state=; Path=/; Max-Age=0; HttpOnly; ${secureFlag}SameSite=Lax`,
    );
    return res.status(400).json({ error: 'Invalid OAuth state' });
  }

  try {
    const log = getLogger(req.headers['x-request-id'] as string);
    const response = await apiStravaOauthToken.post('', null, {
      params: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        grant_type: process.env.GRANT_TYPE,
      },
    });

    const { access_token, refresh_token, expires_at, athlete } = response.data;

    const isProd = process.env.NODE_ENV === 'production';
    const secureFlag = isProd ? 'Secure; ' : '';
    const sameSite = isProd ? 'None' : 'Lax';

    res.setHeader('Set-Cookie', [
      `strava_code=${code}; Path=/; Max-Age=300; HttpOnly; ${secureFlag}SameSite=${sameSite}`, // 5 minutos
      `strava_athleteId=${athlete.id}; Path=/; Max-Age=300; HttpOnly; ${secureFlag}SameSite=${sameSite}`,
      `strava_oauth_state=; Path=/; Max-Age=0; HttpOnly; ${secureFlag}SameSite=Lax`,
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
