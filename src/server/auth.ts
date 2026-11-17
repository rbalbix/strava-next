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
 * **Único caminho: `gl_session`.** O token do cookie só vale se o registro
 * `strava:session:<hash>` existir no Redis — a identidade vem do servidor,
 * nunca de um cookie enviado pelo cliente (D6/PR 2).
 *
 * O ramo legado que aceitava o par `strava_code` + `strava_athleteId` foi
 * **removido por segurança** (VULN-002): ambos os cookies são controlados
 * pelo cliente e não havia validação servidor, o que permitia forjar a
 * identidade de qualquer atleta. Quem ainda estiver com os cookies antigos
 * recebe 401 → o cliente encerra a sessão → login pelo Strava reemite
 * `gl_session` (§2.D.10).
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
  if (!sessionToken) {
    return null;
  }

  return resolveStravaSession(sessionToken);
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
