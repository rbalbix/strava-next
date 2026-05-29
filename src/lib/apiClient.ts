import type { DashboardResponse, LogoutResponse } from '../contracts/api';

async function requestJson<TResponse>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`Request failed: HTTP ${response.status}`);
  }
  if (typeof response.json !== 'function') {
    return undefined as TResponse;
  }
  return response.json() as Promise<TResponse>;
}

const apiClient = {
  getDashboard: () => requestJson<DashboardResponse>('/api/app/dashboard'),
  logout: () =>
    requestJson<LogoutResponse>('/api/app/logout', { method: 'POST' }),
};

export { apiClient, requestJson };
