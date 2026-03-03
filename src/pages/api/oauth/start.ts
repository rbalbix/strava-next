import { randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { STRAVA_ENDPOINTS } from '../../../config';

function getAppUrl(req: NextApiRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured;

  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) || 'http';
  const host = req.headers.host;
  return `${proto}://${host}`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const isProd = process.env.NODE_ENV === 'production';
  const secureFlag = isProd ? 'Secure; ' : '';
  const appUrl = getAppUrl(req);

  const oauthState = randomBytes(24).toString('hex');
  res.setHeader(
    'Set-Cookie',
    `strava_oauth_state=${oauthState}; Path=/; Max-Age=600; HttpOnly; ${secureFlag}SameSite=Lax`,
  );

  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID || '',
    response_type: process.env.RESPONSE_TYPE || 'code',
    approval_prompt: process.env.APPROVAL_PROMPT || 'auto',
    redirect_uri: `${appUrl}/api/authorize`,
    scope: process.env.STRAVA_SCOPE || 'read,profile:read_all,activity:read_all',
    state: oauthState,
  });

  return res.redirect(`${STRAVA_ENDPOINTS.authorize}?${params.toString()}`);
}
