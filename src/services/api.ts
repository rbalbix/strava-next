import axios from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
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

const apiEmail = axios.create({
  baseURL: API_ROUTES.emailUrl,
  ...commonConfig,
});

// Configure retries with exponential backoff for transient failures
const retryOptions = {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  // Retry on network errors or 5xx responses
  retryCondition: (error: any) => {
    return (
      isNetworkOrIdempotentRequestError(error) ||
      Boolean(error.response && error.response.status >= 500)
    );
  },
};

axiosRetry(apiStravaOauthToken, retryOptions);
axiosRetry(apiRemoteStorage, retryOptions);
axiosRetry(apiStravaAuth, retryOptions);
axiosRetry(apiEmail, retryOptions);

export { apiEmail, apiRemoteStorage, apiStravaAuth, apiStravaOauthToken };
