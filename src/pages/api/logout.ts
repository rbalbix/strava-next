import type { NextApiRequest, NextApiResponse } from 'next';
import { clearHttpOnlyCookie, SESSION_COOKIE } from '../../server/cookies';
import { revokeStravaSession } from '../../server/session';
import { getLogger } from '../../services/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  // D6/PR 2: apagar a chave no Redis é o que revoga a sessão de verdade — o
  // cookie sozinho só sai deste navegador, e um valor copiado continuaria
  // valendo até o TTL. É melhor esforço: se o Redis não responder, limpar os
  // cookies já encerra a sessão local, e a chave remanescente expira em 30
  // dias (SESSION_MAX_AGE). Um logout nunca pode falhar por indisponibilidade
  // do Redis — o usuário precisa sair.
  const sessionToken = req.cookies?.[SESSION_COOKIE];
  if (sessionToken) {
    try {
      await revokeStravaSession(sessionToken);
    } catch (error) {
      // O logout não falha por indisponibilidade (comentário acima), mas a
      // falha fica registrada: sem este log, uma chave órfã de revogação seria
      // indistinguível de uma sessão ativa na contagem de `strava:session:*`
      // prevista para o pós-deploy (§8.12.4 do plano).
      getLogger(req.headers['x-request-id'] as string).warn(
        { err: error },
        'Falha ao revogar a sessão no Redis',
      );
    }
  }

  // Os legados (`strava_code`/`strava_athleteId`) são limpos junto para que
  // um logout encerre também a sessão antiga de quem ainda está na janela de
  // migração. SameSite=Lax por padrão (src/server/cookies.ts).
  res.setHeader('Set-Cookie', [
    clearHttpOnlyCookie(SESSION_COOKIE),
    clearHttpOnlyCookie('strava_code'),
    clearHttpOnlyCookie('strava_athleteId'),
    clearHttpOnlyCookie('strava_oauth_state'),
  ]);

  return res.status(200).json({ success: true });
}
