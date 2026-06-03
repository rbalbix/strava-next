import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockSet = vi.fn();

vi.doMock('../../../src/services/redis', () => ({
  default: {
    get: mockGet,
    set: mockSet,
  },
}));

let thresholds: typeof import('../../../src/services/thresholds');

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

  it('returns stored thresholds when present', async () => {
    const stored: import('../../../src/services/thresholds').EquipmentThresholds = {
      bikeA: { chain: 120 },
    };
    mockGet.mockResolvedValue(stored);

    const result = await thresholds.getEquipmentThresholds(123);

    expect(result).toEqual(stored);
  });

  it('saves and returns updated thresholds for a new gear/equipment', async () => {
    mockGet.mockResolvedValue(undefined);
    mockSet.mockResolvedValue('OK');

    const result = await thresholds.saveEquipmentThreshold(
      123,
      'bikeA',
      'chain',
      120,
    );

    expect(mockGet).toHaveBeenCalledWith('strava:equipment-thresholds:123');
    expect(mockSet).toHaveBeenCalledWith('strava:equipment-thresholds:123', {
      bikeA: { chain: 120 },
    });
    expect(result).toEqual({ bikeA: { chain: 120 } });
  });

  it('updates and returns existing thresholds for the same gear/equipment', async () => {
    const stored: import('../../../src/services/thresholds').EquipmentThresholds = {
      bikeA: { chain: 120 },
    };
    mockGet.mockResolvedValue(stored);
    mockSet.mockResolvedValue('OK');

    const result = await thresholds.saveEquipmentThreshold(
      123,
      'bikeA',
      'chain',
      130,
    );

    expect(mockSet).toHaveBeenCalledWith('strava:equipment-thresholds:123', {
      bikeA: { chain: 130 },
    });
    expect(result).toEqual({ bikeA: { chain: 130 } });
  });

  it('throws when thresholdKm is negative', async () => {
    await expect(
      thresholds.saveEquipmentThreshold(123, 'bikeA', 'chain', -10),
    ).rejects.toThrow('thresholdKm must be greater than or equal to 0');
  });

  it('throws when athleteId is invalid', async () => {
    await expect(thresholds.getEquipmentThresholds(0)).rejects.toThrow(
      'athleteId must be a positive number',
    );
  });
});
