import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiError, getHttpStatus } from '../../../src/lib/apiClient';
import type {
  EquipmentThresholds,
  EquipmentThresholdsRequest,
} from '../../../src/contracts/api';

describe('apiClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  it('fetches equipment thresholds from the threshold endpoint', async () => {
    const thresholds: EquipmentThresholds = {
      bikeA: { chain: { value: 250, unit: 'km' } },
    };
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ equipmentThresholds: thresholds }),
    });

    const result = await apiClient.getEquipmentThresholds();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/app/equipment-thresholds',
      undefined,
    );
    expect(result).toEqual(thresholds);
  });

  it('posts threshold payload and returns the updated thresholds', async () => {
    const payload: EquipmentThresholdsRequest = {
      gearId: 'bikeA',
      equipmentId: 'chain',
      thresholdKm: 250,
    };
    const thresholds: EquipmentThresholds = {
      bikeA: { chain: { value: 250, unit: 'km' } },
    };
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ equipmentThresholds: thresholds }),
    });

    const result = await apiClient.saveEquipmentThreshold(payload);

    expect(fetchMock).toHaveBeenCalledWith('/api/app/equipment-thresholds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(thresholds);
  });

  it('throws when the HTTP response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(apiClient.getEquipmentThresholds()).rejects.toThrow(
      'Request failed: HTTP 500',
    );
  });

  it('attaches the HTTP status to the thrown error', async () => {
    // Antes o erro era um Error puro, sem `status`. Consumidores checavam
    // `'status' in err` ou `message.includes('401')` — e o painel de rate
    // limit nunca era exibido, porque o status não existia.
    fetchMock.mockResolvedValue({ ok: false, status: 429 });

    const error = await apiClient
      .getEquipmentThresholds()
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(getHttpStatus(error)).toBe(429);
  });

  it('posts threshold payload with unit and serializes it in the JSON body', async () => {
    const payload: EquipmentThresholdsRequest = {
      gearId: 'bikeA',
      equipmentId: 'suspension',
      thresholdKm: 50,
      unit: 'h',
    };
    const thresholds: EquipmentThresholds = {
      bikeA: { suspension: { value: 50, unit: 'h' } },
    };
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ equipmentThresholds: thresholds }),
    });

    const result = await apiClient.saveEquipmentThreshold(payload);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      gearId: 'bikeA',
      equipmentId: 'suspension',
      thresholdKm: 50,
      unit: 'h',
    });
    expect(result).toEqual(thresholds);
  });
});

describe('getHttpStatus', () => {
  it('reads the status from an ApiError', () => {
    expect(getHttpStatus(new ApiError(401))).toBe(401);
  });

  it('reads the status from a plain object carrying one', () => {
    expect(getHttpStatus({ status: 503 })).toBe(503);
  });

  it('recovers the status from a legacy "HTTP 4xx" message', () => {
    expect(getHttpStatus(new Error('Request failed: HTTP 429'))).toBe(429);
  });

  it('returns undefined for errors without any status', () => {
    expect(getHttpStatus(new Error('Network error'))).toBeUndefined();
    expect(getHttpStatus(undefined)).toBeUndefined();
    expect(getHttpStatus(null)).toBeUndefined();
    expect(getHttpStatus({ status: 'nope' })).toBeUndefined();
  });
});
