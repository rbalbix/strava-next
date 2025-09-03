import axios from 'axios';
import { API_ROUTES, STRAVA_ENDPOINTS } from '../config';

const commonConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Request-ID': generateRequestId(), // Para tracing
  },
};

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const apiStravaOauthToken = axios.create({
  baseURL: STRAVA_ENDPOINTS.oauthToken,
  ...commonConfig,
});

const apiStravaAuth = axios.create({
  baseURL: API_ROUTES.stravaAuthTokens,
  ...commonConfig,
});

const apiRemoteStorage = axios.create({
  baseURL: API_ROUTES.remoteStorage,
  ...commonConfig,
});

export { apiRemoteStorage, apiStravaAuth, apiStravaOauthToken };
