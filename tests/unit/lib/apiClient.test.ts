import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../src/lib/apiClient';
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
