import axios from 'axios';
import { api } from './api';
import redis from './redis';

const REDIS_KEYS = {
  auth: (athleteId: number) => `strava:auth:${athleteId}`,
  activities: (athleteId: number) => `strava:activities:${athleteId}`,
  accessToken: (athleteId: number) => `strava:access_token:${athleteId}`,
};

export async function getAthleteAccessToken(
  athleteId: number
): Promise<string | null> {
  try {
    // Buscar refresh token do atleta (salvo durante OAuth)
    const athleteData = await redis.get(`strava:auth:${athleteId}`);
    if (!athleteData) {
      throw new Error(`Athlete ${athleteId} não encontrado`);
    }

    const {
      refresh_token: refreshToken,
      expires_at: expiresAt,
      athleteInfo,
    } = JSON.parse(String(athleteData));

    console.log('*** - TESTE', athleteInfo);

    // Verificar se o token ainda é válido
    const isExpired = Date.now() >= expiresAt * 1000;

    console.log('*** - TESTE - Expriado ? ', isExpired);

    if (!isExpired) {
      // Token ainda válido, buscar do cache
      const cachedToken = await redis.get(`strava:access_token:${athleteId}`);
      if (cachedToken) {
        return String(cachedToken);
      }
    }

    // Token expirado, fazer refresh
    console.log(`🔄 Refreshing token for athlete ${athleteId}`);
    const newTokens = await refreshStravaToken(refreshToken);

    // 4. Salvar novos tokens
    await redis.setex(
      `strava:access_token:${athleteId}`,
      3600, // 1 hora (Strava tokens expiram em 1h)
      newTokens.access_token
    );

    const authData = {
      refreshToken: newTokens.refresh_token,
      accessToken: newTokens.access_token,
      expiresAt: newTokens.expires_at,
      lastUpdated: Math.floor(Date.now() / 1000),
      athleteInfo,
    };

    await redis.set(`strava:auth:${athleteId}`, JSON.stringify(authData));

    return newTokens.access_token;
  } catch (error) {
    console.error(`Erro ao obter token para athlete ${athleteId}:`, error);
    return null;
  }
}

// Função para refresh do token
export async function refreshStravaToken(refreshToken: string) {
  try {
    const response = await api.post(`/token`, null, {
      params: {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
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
    // ✅ Tratamento de erro do Axios
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
    lastUpdated: Math.floor(Date.now() / 1000),
    athleteInfo,
  };

  // Salvar por 90 dias (refresh_token expiration)
  await redis.setex(
    REDIS_KEYS.auth(athleteId),
    90 * 24 * 3600, // 90 dias
    JSON.stringify(authData)
  );

  // Cache rápido do access_token (1 hora)
  await redis.setex(REDIS_KEYS.accessToken(athleteId), 3600, accessToken);
}
