import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThresholdEntry } from '../../../src/contracts/api';

const mockGet = vi.fn();
const mockSet = vi.fn();

vi.doMock('../../../src/services/redis', () => ({
  default: {
    get: mockGet,
    set: mockSet,
  },
}));

let thresholds: typeof import('../../../src/services/thresholds');

type StoredThresholds = Record<
  string,
  Record<string, number | ThresholdEntry>
>;

beforeEach(async () => {
  vi.resetModules();
  mockGet.mockReset();
  mockSet.mockReset();
  thresholds = await import('../../../src/services/thresholds');
});

describe('thresholds service', () => {
  it('returns an empty object when no thresholds exist', async () => {
    mockGet.mockResolvedValue(undefined);

    const result = await thresholds.getEquipmentThresholds(123);

    expect(mockGet).toHaveBeenCalledWith('strava:equipment-thresholds:123');
    expect(result).toEqual({});
  });

  it('normalizes legacy numeric records to kilometres on read', async () => {
    const stored: StoredThresholds = { bikeA: { chain: 120 } };
    mockGet.mockResolvedValue(stored);

    const result = await thresholds.getEquipmentThresholds(123);

    expect(result).toEqual({ bikeA: { chain: { value: 120, unit: 'km' } } });
  });

  it('keeps the stored unit when the record is already canonical', async () => {
    const stored: StoredThresholds = {
      bikeA: { chain: 120, fork: { value: 50, unit: 'h' } },
    };
    mockGet.mockResolvedValue(stored);

    const result = await thresholds.getEquipmentThresholds(123);

    expect(result).toEqual({
      bikeA: {
        chain: { value: 120, unit: 'km' },
        fork: { value: 50, unit: 'h' },
      },
    });
  });

  it('saves and returns updated thresholds for a new gear/equipment', async () => {
    mockGet.mockResolvedValue(undefined);
    mockSet.mockResolvedValue('OK');

    const result = await thresholds.saveEquipmentThreshold(123, 'bikeA', 'chain', {
      value: 120,
      unit: 'km',
    });

    expect(mockGet).toHaveBeenCalledWith('strava:equipment-thresholds:123');
    expect(mockSet).toHaveBeenCalledWith('strava:equipment-thresholds:123', {
      bikeA: { chain: { value: 120, unit: 'km' } },
    });
    expect(result).toEqual({ bikeA: { chain: { value: 120, unit: 'km' } } });
  });

  it('writes only the saved entry and returns every record normalized', async () => {
    const stored: StoredThresholds = { bikeA: { chain: 120, fork: 300 } };
    mockGet.mockResolvedValue(stored);
    mockSet.mockResolvedValue('OK');

    const result = await thresholds.saveEquipmentThreshold(123, 'bikeA', 'chain', {
      value: 130,
      unit: 'km',
    });

    // Sem migração em escrita: registros legados permanecem como estão (ADR-002).
    expect(mockSet).toHaveBeenCalledWith('strava:equipment-thresholds:123', {
      bikeA: { chain: { value: 130, unit: 'km' }, fork: 300 },
    });
    expect(result).toEqual({
      bikeA: {
        chain: { value: 130, unit: 'km' },
        fork: { value: 300, unit: 'km' },
      },
    });
  });

  it('throws when thresholdKm is negative', async () => {
    await expect(
      thresholds.saveEquipmentThreshold(123, 'bikeA', 'chain', {
        value: -10,
        unit: 'km',
      }),
    ).rejects.toThrow('thresholdKm must be greater than or equal to 0');
  });

  it('throws when the threshold value is not a number', async () => {
    await expect(
      thresholds.saveEquipmentThreshold(123, 'bikeA', 'chain', {
        value: Number.NaN,
        unit: 'km',
      }),
    ).rejects.toThrow('thresholdKm must be a number');

    await expect(
      thresholds.saveEquipmentThreshold(123, 'bikeA', 'chain', {
        value: '100' as unknown as number,
        unit: 'km',
      }),
    ).rejects.toThrow('thresholdKm must be a number');
  });

  it('throws when the unit is not km or h', async () => {
    await expect(
      thresholds.saveEquipmentThreshold(123, 'bikeA', 'chain', {
        value: 100,
        unit: 'minutos' as 'km',
      }),
    ).rejects.toThrow('unit must be km or h');
  });

  it('throws when gearId is missing', async () => {
    await expect(
      thresholds.saveEquipmentThreshold(123, '   ', 'chain', {
        value: 100,
        unit: 'km',
      }),
    ).rejects.toThrow('gearId is required');
  });

  it('throws when equipmentId is missing', async () => {
    await expect(
      thresholds.saveEquipmentThreshold(123, 'bikeA', '', {
        value: 100,
        unit: 'km',
      }),
    ).rejects.toThrow('equipmentId is required');
  });

  it('throws when athleteId is invalid', async () => {
    await expect(thresholds.getEquipmentThresholds(0)).rejects.toThrow(
      'athleteId must be a positive number',
    );

    await expect(
      thresholds.saveEquipmentThreshold(0, 'bikeA', 'chain', {
        value: 100,
        unit: 'km',
      }),
    ).rejects.toThrow('athleteId must be a positive number');
  });
});
