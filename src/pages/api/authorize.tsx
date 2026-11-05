import { NextApiRequest, NextApiResponse } from 'next';
import { SESSION_MAX_AGE } from '../../config';
import {
  clearHttpOnlyCookie,
  getCookieValue,
  serializeHttpOnlyCookie,
  SESSION_COOKIE,
} from '../../server/cookies';
import { getStravaOAuthTokenEnv } from '../../server/env';
import { createStravaSession } from '../../server/session';
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

    // Primeiro tudo o que pode falhar; as cookies só saem quando a sessão
    // está pronta. (Antes iam antes do save, e o catch precisava limpá-las
    // para a landing não abrir um painel que receberia 401.)
    await apiStravaAuth.post('/', {
      athleteId: athlete.id,
      refreshToken: refresh_token,
      accessToken: access_token,
      expiresAt: expires_at,
      athleteInfo: athlete,
    });

    // D6/PR 2: a sessão é um registro no Redis, e o cookie carrega apenas o
    // token opaco que o aponta (§2.D.8 — o `strava_code`, code de troca de
    // uso único, deixou de servir de "sessão").
    const sessionToken = await createStravaSession(athlete.id);

    res.setHeader('Set-Cookie', [
      serializeHttpOnlyCookie(SESSION_COOKIE, sessionToken, {
        maxAge: SESSION_MAX_AGE,
        sameSite: 'Lax',
      }),
      // Migração: um login novo substitui o par legado pelo `gl_session`. Sem
      // esta limpeza, o par antigo sobreviveria ao lado da sessão nova e
      // voltaria a valer como fallback quando o `gl_session` expirasse —
      // prolongando a janela de migração além do previsto (§2.D.10).
      clearHttpOnlyCookie('strava_code', 'Lax'),
      clearHttpOnlyCookie('strava_athleteId', 'Lax'),
      clearHttpOnlyCookie('strava_oauth_state', 'Lax'),
    ]);

    res.redirect('/');
  } catch (error) {
    const log = getLogger(req.headers['x-request-id'] as string);
    log.error({ err: error }, 'Authorize route failed');

    // Como as cookies só são emitidas depois de a sessão estar completa,
    // não há estado parcial a limpar — exceto o estado OAuth, que já foi
    // consumido. Importante NÃO limpar `gl_session`/cookies legados aqui:
    // um login que falha não pode encerrar uma sessão que o usuário já
    // tinha (re-login, conexão caindo no meio da troca de code).
    res.setHeader('Set-Cookie', [
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
