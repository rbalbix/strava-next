const baseAppURL =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'http://localhost:3000';

const baseStravaURL = 'https://www.strava.com';

// Configurações de Sessão
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias em segundos

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
  equipmentThresholds: (athleteId: number) =>
    `strava:equipment-thresholds:${athleteId}`,
  // D14: relatório de códigos não reconhecidos nas observações privadas.
  // Fora do allowlist do remoteStorage de propósito — é gravado lendo direto
  // com redis.set (molde de equipmentThresholds), nunca pela API remota.
  unrecognizedCodes: (athleteId: number) =>
    `strava:unrecognized-codes:${athleteId}`,
  // Lock key used to serialize token refresh per athlete
  refreshLock: (athleteId: number) => `strava:lock:refresh:${athleteId}`,
  // Sessão do aplicativo (D6/PR 2 do plano de usabilidade): recebe o **hash**
  // do token opaco do cookie `gl_session` e devolve o athleteId. O token em
  // claro nunca vira nome de chave. Ver src/server/session.ts.
  session: (hashedToken: string) => `strava:session:${hashedToken}`,
};

// URLs completas da nossa API
export const API_ROUTES = {
  authorizeUrl: `${APP_CONFIG.appUrl}/api/authorize`,
  remoteStorage: `${APP_CONFIG.appUrl}/api/remoteStorage`,
  stravaAuthTokens: `${APP_CONFIG.appUrl}/api/save-tokens`,
  emailUrl: `${APP_CONFIG.appUrl}/api/send-email`,
};

// Endpoints Strava
export const STRAVA_ENDPOINTS = {
  oauthToken: `${APP_CONFIG.strava.oauthStravaUrl}/token`,
  authorize: `${APP_CONFIG.strava.oauthStravaUrl}/authorize`,
};
