import { RateLimit, Strava } from 'strava';
import { getLogger } from '../services/logger';
import { getStravaServerEnv } from './env';

type StoredStravaTokens = {
  accessToken?: string;
  refreshToken: string;
  expiresAt?: number;
};

/**
 * Fração do quota de 15 min a partir da qual o uso vira warning.
 *
 * O SDK expõe `X-RateLimit-Usage` de cada resposta via `on_rate_limit_update`
 * — sem isto, o primeiro sinal de rate limit é o 429 já estourado (que custa
 * uma janela de 15 min inteira). Em 80% dá tempo de o usuário frear o polling
 * ou trocar de aba antes de esgotar as 100 leituras/15min do tier padrão.
 */
const RATE_LIMIT_WARN_RATIO = 0.8;

/**
 * Reporta o uso do quota do Strava a cada resposta da API.
 *
 * `shortTerm*` = janela de 15 min; `longTerm*` = diária (1.000 leituras no
 * tier padrão). A rota de rate limit do Strava também publica esses números
 * em https://www.strava.com/settings/api.
 */
function reportRateLimit(rateLimit: RateLimit): void {
  const log = getLogger();
  log.info({ rateLimit }, 'Strava rate limit usage');

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
      },
      'Strava rate limit perto do limite — janela de 15 min fecha em até 15 min',
    );
  }
}

function createStravaClient(tokens: StoredStravaTokens): Strava | null {
  const env = getStravaServerEnv();
  if (!env.success) return null;

  const credentials = {
    client_id: env.data.CLIENT_ID,
    client_secret: env.data.CLIENT_SECRET,
    refresh_token: tokens.refreshToken,
    on_rate_limit_update: reportRateLimit,
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
