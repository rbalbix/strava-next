import { NextApiRequest, NextApiResponse } from 'next';
import { apiStravaAuth, apiStravaOauthToken } from '../../services/api';
import { getLogger } from '../../services/logger';

export default async function Authorize(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res
      .status(400)
      .json({ error: 'Code parameter is missing or invalid' });
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

    const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';

    res.setHeader('Set-Cookie', [
      `strava_code=${code}; Path=/; Max-Age=300; HttpOnly; ${secureFlag}SameSite=Strict`, // 5 minutos
      `strava_athleteId=${athlete.id}; Path=/; Max-Age=300; HttpOnly; ${secureFlag}SameSite=Strict`,
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
