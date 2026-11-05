import type { NextApiRequest, NextApiResponse } from 'next';
import { getLogger } from '../services/logger';
import { isStravaSessionNotFoundError } from '../services/strava-auth';
import { SESSION_COOKIE } from './cookies';
import { resolveStravaSession } from './session';

export type AuthenticatedNextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  athleteId: number
) => void | Promise<void>;

/**
 * Resolve o atleta autenticado da requisição.
 *
 * **Sessão real (`gl_session`)**: o token do cookie só vale se o registro
 * `strava:session:<hash>` existir no Redis — a identidade vem do servidor,
 * não de um cookie enviado pelo cliente (D6/PR 2).
 *
 * **Legado (janela de migração)**: na ausência do cookie novo, o par
 * `strava_athleteId` (+ `strava_code`) continua sendo aceito como sessão,
 * exatamente como antes. É o que impede deslogar a base existente no deploy;
 * a remoção deste ramo é o "release seguinte" previsto em §2.D.10.
 *
 * `gl_session` presente sem registro → `null`: sessão encerrada (expirada,
 * apagada ou revogada), e o responde 401 é o caminho correto.
 *
 * Pode **lançar** quando o Redis não responde — isso é falha de infra, não
 * fim de sessão, e `withProtectedAPI` responde 500 (retry) em vez de 401
 * (logout), seguindo o princípio do §8.6: uma indisponibilidade não pode
 * deslogar ninguém.
 */
async function getAuthenticatedAthleteId(
  req: NextApiRequest,
): Promise<number | null> {
  const sessionToken = req.cookies?.[SESSION_COOKIE];
  if (sessionToken) {
    return resolveStravaSession(sessionToken);
  }

  const athleteIdRaw = req.cookies?.strava_athleteId;
  const athleteId = Number(athleteIdRaw);

  if (!athleteIdRaw || !Number.isFinite(athleteId) || athleteId <= 0) {
    return null;
  }

  return athleteId;
}

export function withProtectedAPI(handler: AuthenticatedNextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    let athleteId: number | null;
    try {
      athleteId = await getAuthenticatedAthleteId(req);
    } catch (error) {
      // O Redis não respondeu: não dá para afirmar que a sessão acabou.
      // Responder 401 aqui deslogaria o usuário por falha de infra — o
      // mesmo erro do §8.6, agora do lado da sessão nova. 500 + retry é o
      // comportamento D5 (falha transitória mantém a sessão).
      getLogger().error({ err: error }, 'Falha ao consultar a sessão');
      return res
        .status(500)
        .json({ error: 'Internal server error' });
    }

    if (!athleteId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized', reason: 'Session expired or invalid' });
    }

    return handler(req, res, athleteId);
  };
}

/**
 * Traduz "a sessão deste atleta não existe mais no Redis" em **401**.
 *
 * Os handlers protegidos têm um `catch` que responde 500 para qualquer erro —
 * e é o que fazia o app mostrar "não conseguimos atualizar seus dados" com
 * retries infinitos quando o registro do atleta sumia do Redis. Sem sessão não
 * é falha do servidor, é falta de autenticação: o cliente já sabe o que fazer
 * com 401 (encerrar a sessão e voltar para a landing com o ícone de login).
 *
 * Devolve `true` se respondeu; `false` quando o erro é de outra natureza e o
 * chamador deve continuar tratando como antes.
 */
export function respondIfSessionMissing(
  res: NextApiResponse,
  error: unknown,
): boolean {
  if (!isStravaSessionNotFoundError(error)) {
    return false;
  }

  res.status(401).json({
    error: 'Unauthorized',
    reason: 'Session expired or invalid',
  });
  return true;
}

export { getAuthenticatedAthleteId };
