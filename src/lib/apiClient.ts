import type {
  DashboardResponse,
  EquipmentThresholds,
  EquipmentThresholdsRequest,
  EquipmentThresholdsResponse,
  LogoutResponse,
} from '../contracts/api';

/**
 * Erro HTTP que carrega o status real da resposta.
 *
 * Antes, `requestJson` lançava um `Error` puro, e o consumidor inspecionava
 * `err.message.includes('401')` / `'status' in err`. Ambos os testes eram
 * frágeis: um erro de rede ou um erro lançado pela própria lib nunca teria
 * `status`, e o fallback (mensagem substring) deixava passar qualquer erro
 * cuja mensagem contivesse "401" por acidente.
 */
class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Request failed: HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Lê o status HTTP de qualquer erro, sem lançar.
 *
 * Aceita `ApiError`, objetos com `status` numérico e — por segurança —
 * extrai o código de uma mensagem no formato "HTTP 4xx"/"HTTP 5xx", para
 * não recriar o defeito de depender de `'status' in err`.
 */
function getHttpStatus(error: unknown): number | undefined {
  if (error instanceof ApiError) return error.status;

  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number' && Number.isFinite(status)) {
      return status;
    }
  }

  const message = error instanceof Error ? error.message : '';
  const match = /HTTP\s(\d{3})\b/.exec(message);
  return match ? Number(match[1]) : undefined;
}

async function requestJson<TResponse>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  if (typeof response.json !== 'function') {
    return undefined as TResponse;
  }
  return response.json() as Promise<TResponse>;
}

const apiClient = {
  getDashboard: () => requestJson<DashboardResponse>('/api/app/dashboard'),
  getEquipmentThresholds: (): Promise<EquipmentThresholds> =>
    requestJson<EquipmentThresholdsResponse>(
      '/api/app/equipment-thresholds',
    ).then((response) => response.equipmentThresholds),
  saveEquipmentThreshold: (
    payload: EquipmentThresholdsRequest,
  ): Promise<EquipmentThresholds> =>
    requestJson<EquipmentThresholdsResponse>('/api/app/equipment-thresholds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((response) => response.equipmentThresholds),
  logout: () =>
    requestJson<LogoutResponse>('/api/app/logout', { method: 'POST' }),
};

export { apiClient, ApiError, getHttpStatus, requestJson };
