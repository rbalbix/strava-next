import { RateLimit, Strava } from 'strava';
import { getLogger } from '../services/logger';
import { stravaApiResponses } from '../services/metrics';
import { getStravaServerEnv } from './env';

type StoredStravaTokens = {
  accessToken?: string;
  refreshToken: string;
  expiresAt?: number;
};

/**
 * Atribuição do consumo do quota (design 2026-11-18): quem está fazendo as
 * chamadas. Sem isto o log de rate limit diz *quanto* foi usado, mas nunca
 * *por qual fluxo* (dashboard × webhook) — e a pergunta "rebuild cabe na
 * janela de 600?" só se respondia inspecionando Redis à mão.
 *
 * `athleteId` entra só no log (cardinalidade de métrica é por `context`).
 */
type RateLimitContext = {
  context?: string;
  athleteId?: number;
};

/**
 * Fração do quota de 15 min a partir da qual o uso vira warning.
 *
 * O SDK expõe `X-RateLimit-Usage` de cada resposta via `on_rate_limit_update`
 * — sem isto, o primeiro sinal de rate limit é o 429 já estourado (que custa
 * uma janela de 15 min inteira). Em 80% dá tempo de o usuário frear o polling
 * ou trocar de aba antes de esgotar as 600 leituras/15min da cota real do app
 * em produção (verificado 2026-11-18; o tier padrão do Strava seria 100).
 */
const RATE_LIMIT_WARN_RATIO = 0.8;

/**
 * Reporta o uso do quota do Strava a cada resposta da API.
 *
 * `shortTerm*` = janela de 15 min; `longTerm*` = diária (6.000 leituras na
 * cota real do app em produção; o tier padrão do Strava seria 1.000). A rota
 * de rate limit do Strava também publica esses números em
 * https://www.strava.com/settings/api.
 */
function reportRateLimit(rateLimit: RateLimit, ctx?: RateLimitContext): void {
  const log = getLogger();
  const context = ctx?.context ?? 'unknown';
  log.info(
    { rateLimit, context, athleteId: ctx?.athleteId },
    'Strava rate limit usage',
  );

  // 1 relatório ≈ 1 resposta ≈ 1 unidade de quota. Contador por `context`
  // (label de baixa cardinalidade) — athleteId fica só no log acima.
  stravaApiResponses.inc({ context });

  const { shortTermUsage, shortTermLimit } = rateLimit;
  if (
    typeof shortTermUsage === 'number' &&
    typeof shortTermLimit === 'number' &&
    shortTermLimit > 0 &&
    shortTermUsage / shortTermLimit >= RATE_LIMIT_WARN_RATIO
  ) {
    log.warn(
      {
        rateLimit,
        ratio: shortTermUsage / shortTermLimit,
        context,
      },
      'Strava rate limit perto do limite — janela de 15 min fecha em até 15 min',
    );
  }
}

function createStravaClient(
  tokens: StoredStravaTokens,
  ctx?: RateLimitContext,
): Strava | null {
  const env = getStravaServerEnv();
  if (!env.success) return null;

  const credentials = {
    client_id: env.data.CLIENT_ID,
    client_secret: env.data.CLIENT_SECRET,
    refresh_token: tokens.refreshToken,
    // Closure: o SDK dispara o callback a cada resposta, sem saber quem
    // chamou — o contexto entra aqui, no momento da criação do client.
    on_rate_limit_update: (rateLimit: RateLimit) =>
      reportRateLimit(rateLimit, ctx),
  };

  if (!tokens.accessToken || !tokens.expiresAt) {
    return new Strava(credentials);
  }

  return new Strava(credentials, {
    access_token: tokens.accessToken,
    expires_at: tokens.expiresAt,
    refresh_token: tokens.refreshToken,
  });
}

export { createStravaClient, reportRateLimit };
export type { RateLimitContext };
