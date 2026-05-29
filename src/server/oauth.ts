import { randomBytes } from 'crypto';
import type { NextApiRequest } from 'next';
import { STRAVA_ENDPOINTS } from '../config';
import { getStravaOAuthStartEnv } from './env';

function getAppUrl(req: NextApiRequest): string {
  const configured =
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_URL
      : undefined;
  if (configured) return configured.replace(/\/$/, '');

  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) || 'http';
  const host = req.headers.host;
  return `${proto}://${host}`;
}

function createOAuthState(): string {
  return randomBytes(24).toString('hex');
}

function buildStravaAuthorizeUrl(req: NextApiRequest, state: string): string {
  const env = getStravaOAuthStartEnv();
  if (!env.success) {
    throw new Error('Server auth config missing');
  }

  const appUrl = getAppUrl(req);
  const params = new URLSearchParams({
    client_id: env.data.CLIENT_ID,
    response_type: env.data.RESPONSE_TYPE,
    approval_prompt: env.data.APPROVAL_PROMPT,
    redirect_uri: `${appUrl}/api/authorize`,
    scope: env.data.STRAVA_SCOPE,
    state,
  });

  return `${STRAVA_ENDPOINTS.authorize}?${params.toString()}`;
}

export { buildStravaAuthorizeUrl, createOAuthState, getAppUrl };
