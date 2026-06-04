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
    const thresholds: EquipmentThresholds = { bikeA: { chain: 250 } };
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ equipmentThresholds: thresholds }),
    });

    const result = await apiClient.getEquipmentThresholds();

    expect(fetchMock).toHaveBeenCalledWith('/api/app/equipment-thresholds', undefined);
    expect(result).toEqual(thresholds);
  });

  it('posts threshold payload and returns the updated thresholds', async () => {
    const payload: EquipmentThresholdsRequest = {
      gearId: 'bikeA',
      equipmentId: 'chain',
      thresholdKm: 250,
    };
    const thresholds: EquipmentThresholds = { bikeA: { chain: 250 } };
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
});
