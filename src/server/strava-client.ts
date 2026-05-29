import { Strava } from 'strava';
import { getStravaServerEnv } from './env';

type StoredStravaTokens = {
  accessToken?: string;
  refreshToken: string;
  expiresAt?: number;
};

function createStravaClient(tokens: StoredStravaTokens): Strava | null {
  const env = getStravaServerEnv();
  if (!env.success) return null;

  const credentials = {
    client_id: env.data.CLIENT_ID,
    client_secret: env.data.CLIENT_SECRET,
    refresh_token: tokens.refreshToken,
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

export { createStravaClient };
