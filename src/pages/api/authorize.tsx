import { NextApiRequest, NextApiResponse } from 'next';
import { SESSION_MAX_AGE } from '../../config';
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
      serializeHttpOnlyCookie('strava_code', code, { maxAge: SESSION_MAX_AGE, sameSite: 'Lax' }),
      serializeHttpOnlyCookie('strava_athleteId', String(athlete.id), {
        maxAge: SESSION_MAX_AGE,
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

    // A troca pode falhar depois de as cookies de sessão terem sido emitidas
    // (por exemplo, se /api/save-tokens falhar). Sem limpá-las, `/` renderiza
    // o painel, recebe 401 e precisa de outro round-trip só para finalmente
    // chegar à landing. A falha de login deve terminar diretamente na landing
    // pública, sem estado parcial nem mensagem de sessão expirada.
    res.setHeader('Set-Cookie', [
      clearHttpOnlyCookie('strava_code', 'Lax'),
      clearHttpOnlyCookie('strava_athleteId', 'Lax'),
      clearHttpOnlyCookie('strava_oauth_state', 'Lax'),
    ]);

    // A falha na troca do code levava o usuário a /404 — um beco sem saída
    // depois de clicar em "Entrar". O destino correto é a landing: sem sessão
    // e sem mensagem, com o CTA de login à vista.
    //
    // Isto só é seguro desde que `/` deixou de redirecionar para o OAuth
    // (§8.1, A1). Antes, voltar para `/` reabria o loop de reautenticação:
    // `/` mandava para /api/oauth/start, que falhava de novo, e assim por
    // diante. Hoje a landing é um destino terminal.
    res.redirect('/');
  }
}
