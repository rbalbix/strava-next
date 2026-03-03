import axios from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import { API_ROUTES, STRAVA_ENDPOINTS } from '../config';

const commonConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

const internalApiHeaders = process.env.INTERNAL_API_TOKEN
  ? { 'X-Internal-Api-Key': process.env.INTERNAL_API_TOKEN }
  : {};

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const apiStravaOauthToken = axios.create({
  baseURL: STRAVA_ENDPOINTS.oauthToken,
  ...commonConfig,
});

const apiStravaAuth = axios.create({
  ...commonConfig,
  baseURL: API_ROUTES.stravaAuthTokens,
  headers: {
    ...commonConfig.headers,
    ...internalApiHeaders,
  },
});

const apiRemoteStorage = axios.create({
  ...commonConfig,
  baseURL: API_ROUTES.remoteStorage,
  headers: {
    ...commonConfig.headers,
    ...internalApiHeaders,
  },
});

const apiEmail = axios.create({
  ...commonConfig,
  baseURL: API_ROUTES.emailUrl,
  headers: {
    ...commonConfig.headers,
    ...internalApiHeaders,
  },
});

function ensureRequestIdHeader(instance: typeof apiStravaOauthToken) {
  instance.interceptors.request.use((config) => {
    const headers = config.headers || {};
    const hasRequestId =
      (typeof (headers as Record<string, unknown>)['X-Request-ID'] ===
        'string' &&
        String((headers as Record<string, unknown>)['X-Request-ID']).length >
          0) ||
      (typeof (headers as Record<string, unknown>)['x-request-id'] ===
        'string' &&
        String((headers as Record<string, unknown>)['x-request-id']).length >
          0);

    if (!hasRequestId) {
      (headers as Record<string, string>)['X-Request-ID'] = generateRequestId();
    }
    config.headers = headers;
    return config;
  });
}

// Configure retries with exponential backoff for transient failures
const retryOptions = {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  // Retry on network errors or 5xx responses
  retryCondition: (error: unknown) => {
    const axiosError = axios.isAxiosError(error) ? error : null;
    return (
      Boolean(axiosError && isNetworkOrIdempotentRequestError(axiosError)) ||
      Boolean(axiosError?.response && axiosError.response.status >= 500)
    );
  },
};

axiosRetry(apiStravaOauthToken, retryOptions);
axiosRetry(apiRemoteStorage, retryOptions);
axiosRetry(apiStravaAuth, retryOptions);
axiosRetry(apiEmail, retryOptions);
ensureRequestIdHeader(apiStravaOauthToken);
ensureRequestIdHeader(apiRemoteStorage);
ensureRequestIdHeader(apiStravaAuth);
ensureRequestIdHeader(apiEmail);

export { apiEmail, apiRemoteStorage, apiStravaAuth, apiStravaOauthToken };
