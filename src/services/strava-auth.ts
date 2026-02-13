import axios from 'axios';
import { getUnixTime } from 'date-fns';
import { REDIS_KEYS } from '../config';
import { getLogger } from './logger';
import { apiStravaOauthToken } from './api';
import redis from './redis';

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
  try {
    // Buscar refresh token do atleta (salvo durante OAuth)
    const athleteRaw: any = await redis.get(REDIS_KEYS.auth(athleteId));

    const athleteData: StravaAuthData =
      typeof athleteRaw === 'string' ? JSON.parse(athleteRaw) : athleteRaw;

    if (!athleteData) {
      throw new Error(`Athlete ${athleteId} não encontrado`);
    }

    const { refreshToken, expiresAt, athleteInfo, accessToken } = athleteData;

    // Verificar se o token ainda é válido
    const isExpired = Date.now() >= expiresAt * 1000;

    if (!isExpired) {
      // Token ainda válido, buscar do cache
      if (accessToken) {
        return {
          accessToken,
          refreshToken,
          expiresAt,
        };
      }
    }

    // Token expirado, tentar refresh com lock para evitar race conditions
    const lockKey = REDIS_KEYS.refreshLock(athleteId);

    // Tenta adquirir lock (NX) com expiração curta
    const lockAcquired = await redis.set(lockKey, '1', { nx: true, ex: 30 });

    if (lockAcquired) {
      try {
        const newTokens = await refreshStravaToken(refreshToken);

        await saveStravaAuth(
          athleteId,
          newTokens.refresh_token,
          newTokens.access_token,
          newTokens.expires_at,
          athleteInfo,
        );

        return {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: newTokens.expires_at,
        };
      } finally {
        try {
          await redis.del(lockKey);
        } catch (e) {
          // noop: best-effort release
          getLogger().error({ err: e }, 'Erro ao liberar lock de refresh');
        }
      }
    } else {
      // Outro processo está atualizando o token — aguardar leituras repetidas
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 6; i++) {
        await wait(500);
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
          return {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            expiresAt: refreshed.expiresAt,
          };
        }
      }

      // Se ninguém atualizou após espera, tentar refresh localmente (fallback)
      const newTokens = await refreshStravaToken(refreshToken);

      await saveStravaAuth(
        athleteId,
        newTokens.refresh_token,
        newTokens.access_token,
        newTokens.expires_at,
        athleteInfo,
      );

      return {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt: newTokens.expires_at,
      };
    }
  } catch (error) {
    getLogger().error(
      { err: error, athleteId },
      'Erro ao obter token para athlete',
    );
    throw new Error(`Erro ao obter token para athlete ${athleteId}:`);
  }
}

export async function refreshStravaToken(refreshToken: string) {
  try {
    const response = await apiStravaOauthToken.post('', null, {
      params: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
    });

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    } else {
      throw new Error(
        `Refresh token failed: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Refresh token failed: ${error.response?.status} ${error.message}`,
      );
    }
    throw new Error('Refresh token failed: Unknown error');
  }
}

export async function saveStravaAuth(
  athleteId: number,
  refreshToken: string,
  accessToken: string,
  expiresAt: number,
  athleteInfo: any,
) {
  const authData = {
    refreshToken,
    accessToken,
    expiresAt,
    lastUpdated: getUnixTime(Date.now()),
    athleteInfo,
  };

  // Salvar por 90 dias (refresh_token expiration)
  await redis.setex(
    REDIS_KEYS.auth(athleteId),
    90 * 24 * 3600, // 90 dias
    JSON.stringify(authData),
  );
}
