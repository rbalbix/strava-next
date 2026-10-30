import type { NextApiRequest, NextApiResponse } from 'next';
import { isStravaSessionNotFoundError } from '../services/strava-auth';

export type AuthenticatedNextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  athleteId: number
) => void | Promise<void>;

function getAuthenticatedAthleteId(req: NextApiRequest): number | null {
  const athleteIdRaw = req.cookies?.strava_athleteId;
  const athleteId = Number(athleteIdRaw);

  if (!athleteIdRaw || !Number.isFinite(athleteId) || athleteId <= 0) {
    return null;
  }

  return athleteId;
}

export function withProtectedAPI(handler: AuthenticatedNextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const athleteId = getAuthenticatedAthleteId(req);

    if (!athleteId) {
      return res.status(401).json({ error: 'Unauthorized', reason: 'Session expired or invalid' });
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
