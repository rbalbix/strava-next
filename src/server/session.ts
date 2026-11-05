import { createHash, randomBytes } from 'node:crypto';
import { REDIS_KEYS, SESSION_MAX_AGE } from '../config';
import redis from '../services/redis';

/**
 * Sessão real do aplicativo — D6 / PR 2 do plano de usabilidade.
 *
 * O cookie `gl_session` carrega um token opaco de 256 bits que, sozinho, não
 * significa nada: o servidor só o trata como sessão se existir o registro
 * correspondente no Redis (`strava:session:<sha256(token)>` → athleteId,
 * TTL de 30 dias). É o que substitui o `strava_code` — o *code de troca do
 * OAuth, de uso único* — que até aqui era gravado como cookie de sessão e
 * aceito cegamente (§2.D.8).
 *
 * Duas propriedades que o modelo anterior não tinha:
 *
 * - **Revogação server-side**: apagar a chave invalida o token em qualquer
 *   dispositivo, imediatamente. É o que `/api/logout` faz.
 * - **Identidade vinda do servidor**: o athleteId sai do registro, não de um
 *   cookie enviado pelo cliente (`strava_athleteId`).
 *
 * O registro expira sozinho em `SESSION_MAX_AGE` (30 dias) — a mesma vida
 * útil do cookie — e é apagado no logout.
 *
 * Falha ao consultar/gravar aqui é **falha de infra**, não fim de sessão:
 * quem chama deve responder 500 com retry (D5) e nunca 401, que deslogaria o
 * usuário por indisponibilidade do Redis — o princípio do §8.6.
 */

/** Chave Redis de uma sessão: só o hash do token aparece no nome. */
function sessionKey(token: string): string {
  return REDIS_KEYS.session(
    createHash('sha256').update(token).digest('hex'),
  );
}

/**
 * Cria a sessão do atleta e devolve o token a ser gravado no cookie.
 *
 * O token é gerado aqui (não recebido de fora) para que nenhum chamador
 * escolha um valor fraco ou reutilize tokens.
 */
export async function createStravaSession(athleteId: number): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await redis.setex(sessionKey(token), SESSION_MAX_AGE, String(athleteId));
  return token;
}

/**
 * Resolve o athleteId de um token.
 *
 * Devolve `null` quando o registro não existe (sessão expirada, apagada ou
 * revogada) — é "não autenticado", não erro. Pode **lançar** quando o Redis
 * não responde: o chamador precisa distinguir os dois casos (401 × 500).
 */
export async function resolveStravaSession(
  token: string,
): Promise<number | null> {
  const raw = await redis.get(sessionKey(token));
  const athleteId = Number(raw);
  // `Number(null)` é 0 e `Number('')` é 0 — o filtro `> 0` cobre ambos, além
  // de não-numéricos (NaN). O cliente Upstash devolve o valor já parseado
  // quando ele é JSON válido, então `raw` pode ser string ou number.
  return Number.isFinite(athleteId) && athleteId > 0 ? athleteId : null;
}

/** Invalida a sessão no Redis (revogação imediata do token). */
export async function revokeStravaSession(token: string): Promise<void> {
  await redis.del(sessionKey(token));
}
