import axios from 'axios';
import { getUnixTime } from 'date-fns';
import { REDIS_KEYS } from '../config';
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
  athleteId: number
): Promise<StravaTokens | null> {
  try {
    // Buscar refresh token do atleta (salvo durante OAuth)
    const athleteData: StravaAuthData = await redis.get(
      REDIS_KEYS.auth(athleteId)
    );

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

    // Token expirado, fazer refresh
    const newTokens = await refreshStravaToken(refreshToken);

    await saveStravaAuth(
      athleteId,
      newTokens.refresh_token,
      newTokens.access_token,
      newTokens.expires_at,
      athleteInfo
    );

    return {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: newTokens.expires_at,
    };
  } catch (error) {
    console.error(`Erro ao obter token para athlete ${athleteId}:`, error);
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
        `Refresh token failed: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Refresh token failed: ${error.response?.status} ${error.message}`
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
  athleteInfo: any
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
    JSON.stringify(authData)
  );
}
