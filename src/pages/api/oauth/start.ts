import type { NextApiRequest, NextApiResponse } from 'next';
import { serializeHttpOnlyCookie } from '../../../server/cookies';
import { buildStravaAuthorizeUrl, createOAuthState } from '../../../server/oauth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  let authorizeUrl: string;
  const oauthState = createOAuthState();

  try {
    authorizeUrl = buildStravaAuthorizeUrl(req, oauthState);
  } catch (_) {
    return res.status(500).json({ error: 'Server auth config missing' });
  }

  res.setHeader(
    'Set-Cookie',
    serializeHttpOnlyCookie('strava_oauth_state', oauthState, {
      maxAge: 600,
      sameSite: 'Lax',
    }),
  );

  return res.redirect(authorizeUrl);
}
