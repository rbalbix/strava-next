import { NextApiRequest, NextApiResponse } from 'next';
import { apiStravaAuth, apiStravaOauthToken } from '../../services/api';

export default async function Authorize(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res
      .status(400)
      .json({ error: 'Code parameter is missing or invalid' });
  }

  try {
    const response = await apiStravaOauthToken.post('', null, {
      params: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        grant_type: process.env.GRANT_TYPE,
      },
    });

    const { access_token, refresh_token, expires_at, athlete } = response.data;

    res.setHeader('Set-Cookie', [
      `strava_code=${code}; Path=/; SameSite=Lax; Max-Age=300`, // 5 minutos
      `strava_athleteId=${athlete.id}; Path=/; SameSite=Lax; Max-Age=300`,
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
    console.error('💥 ERRO COMPLETO:', error);
    console.error('Stack:', error.stack);

    res.redirect(`/404`);
  }
}
