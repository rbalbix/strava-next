import axios from 'axios';
import { getUnixTime } from 'date-fns';
import { REDIS_KEYS } from '../config';
import { getLogger } from './logger';
import { apiStravaOauthToken } from './api';
import redis from './redis';

// Retry configuration for token refresh
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 4000,
  backoffMultiplier: 2,
};

// Lock configuration
const LOCK_CONFIG = {
  ttlSeconds: 60, // Increased from 30s to allow slower API calls
  maxWaitMs: 35000, // Max time to wait for other process to refresh (slightly more than TTL)
  pollIntervalMs: 500, // How often to check if token was refreshed
};

export interface StravaAuthData {
  refreshToken: string;
  accessToken: string;
  expiresAt: number;
  lastUpdated: number;
  athleteInfo: any;
}

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athlete?: any;
}

export async function getAthleteAccessToken(
  athleteId: number,
): Promise<StravaTokens | null> {
  const log = getLogger();
  try {
    // Buscar refresh token do atleta (salvo durante OAuth)
    const athleteRaw: any = await redis.get(REDIS_KEYS.auth(athleteId));

    const athleteData: StravaAuthData =
      typeof athleteRaw === 'string' ? JSON.parse(athleteRaw) : athleteRaw;

    if (!athleteData) {
      log.error({ athleteId }, 'Athlete não encontrado no Redis');
      throw new Error(`Athlete ${athleteId} não encontrado`);
    }

    const { refreshToken, expiresAt, athleteInfo, accessToken } = athleteData;

    // Verificar se o token ainda é válido
    const isExpired = Date.now() >= expiresAt * 1000;

    if (!isExpired && accessToken) {
      log.debug({ athleteId }, 'Token ainda válido, retornando do cache');
      return {
        accessToken,
        refreshToken,
        expiresAt,
      };
    }

    log.info({ athleteId, isExpired }, 'Token expirado, iniciando refresh');

    // Token expirado, tentar refresh com lock para evitar race conditions
    const lockKey = REDIS_KEYS.refreshLock(athleteId);
    const lockAcquired = await redis.set(lockKey, '1', {
      nx: true,
      ex: LOCK_CONFIG.ttlSeconds,
    });

    if (lockAcquired) {
      log.debug({ athleteId }, 'Lock adquirido, iniciando refresh de token');
      try {
        const newTokens = await refreshStravaToken(refreshToken, athleteId);

        await saveStravaAuth(
          athleteId,
          newTokens.refresh_token,
          newTokens.access_token,
          newTokens.expires_at,
          athleteInfo,
        );

        log.info(
          { athleteId, expiresAt: newTokens.expires_at },
          'Token refresh bem-sucedido',
        );

        return {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: newTokens.expires_at,
        };
      } catch (error) {
        log.error(
          { err: error, athleteId },
          'Erro ao fazer refresh de token com lock',
        );
        throw error;
      } finally {
        try {
          await redis.del(lockKey);
          log.debug({ athleteId }, 'Lock liberado com sucesso');
        } catch (e) {
          log.error(
            { err: e, athleteId },
            'Erro ao liberar lock de refresh',
          );
        }
      }
    } else {
      // Outro processo está atualizando o token — aguardar com timeout
      log.info(
        { athleteId },
        'Lock não adquirido, outro processo está fazendo refresh. Aguardando...',
      );
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const startWaitTime = Date.now();

      while (Date.now() - startWaitTime < LOCK_CONFIG.maxWaitMs) {
        await wait(LOCK_CONFIG.pollIntervalMs);
        const refreshedRaw: any = await redis.get(REDIS_KEYS.auth(athleteId));
        const refreshed: StravaAuthData =
          typeof refreshedRaw === 'string'
            ? JSON.parse(refreshedRaw)
            : refreshedRaw;

        if (
          refreshed &&
          refreshed.accessToken &&
          Date.now() < refreshed.expiresAt * 1000
        ) {
          const waitTime = Date.now() - startWaitTime;
          log.info(
            { athleteId, waitTimeMs: waitTime },
            'Token foi atualizado por outro processo',
          );
          return {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            expiresAt: refreshed.expiresAt,
          };
        }
      }

      // Timeout: outro processo falhou ou travou. Tentar refresh localmente como fallback
      const waitTime = Date.now() - startWaitTime;
      log.warn(
        {
          athleteId,
          waitTimeMs: waitTime,
          maxWaitMs: LOCK_CONFIG.maxWaitMs,
        },
        'Timeout aguardando refresh de outro processo. Tentando refresh localmente como fallback',
      );

      try {
        const newTokens = await refreshStravaToken(refreshToken, athleteId);

        await saveStravaAuth(
          athleteId,
          newTokens.refresh_token,
          newTokens.access_token,
          newTokens.expires_at,
          athleteInfo,
        );

        log.info(
          { athleteId, expiresAt: newTokens.expires_at },
          'Token refresh realizado como fallback (lock travado)',
        );

        return {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: newTokens.expires_at,
        };
      } catch (error) {
        log.error(
          { err: error, athleteId },
          'Erro ao fazer refresh como fallback após timeout',
        );
        throw error;
      }
    }
  } catch (error) {
    log.error(
      { err: error, athleteId },
      'Erro crítico ao obter token para athlete',
    );
    throw new Error(
      `Erro ao obter token para athlete ${athleteId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function exponentialBackoffWait(attemptNumber: number): Promise<void> {
  if (attemptNumber === 0) return; // No delay on first attempt

  let delayMs =
    RETRY_CONFIG.initialDelayMs *
    Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber - 1);
  delayMs = Math.min(delayMs, RETRY_CONFIG.maxDelayMs);

  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function refreshStravaToken(
  refreshToken: string,
  athleteId?: number,
) {
  const log = getLogger();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        const delay =
          RETRY_CONFIG.initialDelayMs *
          Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
        log.info(
          {
            athleteId,
            attempt: attempt + 1,
            maxAttempts: RETRY_CONFIG.maxAttempts,
            delayMs: delay,
          },
          'Aguardando antes de retry de refresh de token',
        );
        await exponentialBackoffWait(attempt);
      }

      log.debug(
        {
          athleteId,
          attempt: attempt + 1,
          maxAttempts: RETRY_CONFIG.maxAttempts,
        },
        'Tentando refresh de token',
      );

      const response = await apiStravaOauthToken.post('', null, {
        params: {
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
      });

      if (response.status >= 200 && response.status < 300) {
        log.info(
          { athleteId, attempt: attempt + 1 },
          'Refresh de token bem-sucedido',
        );
        return response.data;
      } else {
        lastError = new Error(
          `Refresh token failed: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(String(error));

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const isRetryable =
          !statusCode || statusCode >= 500 || statusCode === 429;

        log.warn(
          {
            athleteId,
            attempt: attempt + 1,
            statusCode,
            isRetryable,
            message: error.message,
          },
          'Erro ao fazer refresh de token',
        );

        if (!isRetryable) {
          // Non-retryable errors: 4xx (except 429)
          log.error(
            { athleteId, statusCode, message: error.message },
            'Erro não-retentável ao fazer refresh de token',
          );
          throw new Error(
            `Refresh token failed (não-retentável): ${statusCode} ${error.message}`,
          );
        }
      } else {
        log.warn(
          { athleteId, attempt: attempt + 1, err: error },
          'Erro inesperado ao fazer refresh de token',
        );
      }

      // Continue to next attempt if retryable
      if (attempt < RETRY_CONFIG.maxAttempts - 1) {
        continue;
      }
    }
  }

  // All retries exhausted
  log.error(
    {
      athleteId,
      maxAttempts: RETRY_CONFIG.maxAttempts,
      lastError: lastError?.message,
    },
    'Todas as tentativas de refresh de token falharam',
  );
  throw lastError || new Error('Refresh token failed: Unknown error');
}

export async function saveStravaAuth(
  athleteId: number,
  refreshToken: string,
  accessToken: string,
  expiresAt: number,
  athleteInfo: any,
) {
  const log = getLogger();
  const authData = {
    refreshToken,
    accessToken,
    expiresAt,
    lastUpdated: getUnixTime(Date.now()),
    athleteInfo,
  };

  try {
    // Salvar por 90 dias (refresh_token expiration)
    await redis.setex(
      REDIS_KEYS.auth(athleteId),
      90 * 24 * 3600, // 90 dias
      JSON.stringify(authData),
    );

    // Health check: verify token was saved correctly
    const savedRaw: any = await redis.get(REDIS_KEYS.auth(athleteId));
    const saved: StravaAuthData =
      typeof savedRaw === 'string' ? JSON.parse(savedRaw) : savedRaw;

    if (!saved || saved.accessToken !== accessToken) {
      log.error(
        {
          athleteId,
          savedAccessToken: saved?.accessToken,
          newAccessToken: accessToken,
        },
        'Health check falhou: token não salvo corretamente no Redis',
      );
      throw new Error(
        `Health check failed: token não foi salvo corretamente para athlete ${athleteId}`,
      );
    }

    log.debug(
      { athleteId, expiresAt },
      'Auth data salvo com sucesso e validado',
    );
  } catch (error) {
    log.error({ err: error, athleteId }, 'Erro ao salvar auth data no Redis');
    throw error;
  }
}
