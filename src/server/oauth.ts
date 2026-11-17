import { randomBytes } from 'crypto';
import type { NextApiRequest } from 'next';
import { STRAVA_ENDPOINTS } from '../config';
import { getStravaOAuthStartEnv } from './env';

/**
 * Base URL da aplicação para o `redirect_uri` do OAuth.
 *
 * Em produção usa **exclusivamente** `NEXT_PUBLIC_APP_URL` (VULN-008): se a
 * variável não estiver definida, lança em vez de cair para o header `Host`,
 * que é controlável pelo cliente e permitiria redirecionar o `state`/code do
 * OAuth para um host atacante. O chamador já trata a exceção respondendo 500.
 *
 * Fora de produção o fallback para `x-forwarded-proto`/`host` continua
 * permitido (dev/localhost não é exposto).
 */
function getAppUrl(req: NextApiRequest): string {
  if (process.env.NODE_ENV === 'production') {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (!configured) {
      throw new Error('NEXT_PUBLIC_APP_URL is not configured');
    }
    return configured.replace(/\/$/, '');
  }

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
