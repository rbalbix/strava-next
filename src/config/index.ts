const baseAppURL =
  process.env.NODE_ENV === 'production'
    ? process.env.PUBLIC_APP_URL
    : 'http://localhost:3000';

const baseStravaURL = 'https://www.strava.com';

// Configurações base da aplicação
export const APP_CONFIG = {
  // URL da aplicação
  appUrl: `${baseAppURL}`,

  // URLs da API Strava
  strava: {
    oauthStravaUrl: `${baseStravaURL}/oauth`,
    apiStravaUrl: `${baseStravaURL}/api/v3`,
  },

  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
};

export const REDIS_KEYS = {
  auth: (athleteId: number) => `strava:auth:${athleteId}`,
  activities: (athleteId: number) => `strava:activities:${athleteId}`,
  statistics: (athleteId: number) => `strava:statistics:${athleteId}`,
};

// URLs completas da nossa API
export const API_ROUTES = {
  authorizeUrl: `${APP_CONFIG.appUrl}/api/authorize`,
  remoteStorage: `${APP_CONFIG.appUrl}/api/remoteStorage`,
  stravaAuthTokens: `${APP_CONFIG.appUrl}/api/save-tokens`,
};

// Endpoints Strava
export const STRAVA_ENDPOINTS = {
  oauthToken: `${APP_CONFIG.strava.oauthStravaUrl}/token`,
  authorize: `${APP_CONFIG.strava.oauthStravaUrl}/authorize`,
};
