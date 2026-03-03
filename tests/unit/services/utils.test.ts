import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('../../../src/services/api', () => ({
  apiRemoteStorage: {
    post: mocks.mockPost,
  },
}));

vi.mock('../../../src/services/logger', () => ({
  getLogger: () => ({
    info: mocks.mockLoggerInfo,
    error: mocks.mockLoggerError,
  }),
}));

import {
  mergeActivities,
  mergeGearStats,
  saveRemote,
  secondsToHms,
  updateActivityInArray,
} from '../../../src/services/utils';

describe('utils service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats seconds to HH:MM', () => {
    expect(secondsToHms(0)).toBe('00:00');
    expect(secondsToHms(3660)).toBe('01:01');
  });

  it('updates existing activity by id', () => {
    const existing = [
      {
        id: 1,
        name: 'A',
        distance: 1000,
        moving_time: 100,
        type: 'Ride',
        start_date_local: '2026-01-01T00:00:00Z',
        gear_id: 'g1',
        private_note: '',
      },
    ] as any[];

    const result = updateActivityInArray(
      { id: 1, name: 'A2', distance: 2000 },
      existing as any,
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('A2');
    expect(result[0].distance).toBe(2000);
  });

  it('prepends new activity when id does not exist', () => {
    const existing = [
      {
        id: 1,
        name: 'A',
        distance: 1000,
        moving_time: 100,
        type: 'Ride',
        start_date_local: '2026-01-01T00:00:00Z',
        gear_id: 'g1',
        private_note: '',
      },
    ] as any[];

    const result = updateActivityInArray(
      {
        id: 2,
        name: 'B',
        distance: 500,
        moving_time: 50,
        start_date_local: '2026-01-02T00:00:00Z',
        gear_id: 'g2',
      },
      existing as any,
    );
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(2);
  });

  it('merges activities and keeps newest by id', () => {
    const existing = [
      {
        id: 1,
        name: 'Old',
        distance: 1000,
        moving_time: 100,
        type: 'Ride',
        start_date_local: '2026-01-01T00:00:00Z',
        gear_id: 'g1',
        private_note: '',
      },
      {
        id: 2,
        name: 'Stay',
        distance: 500,
        moving_time: 50,
        type: 'Ride',
        start_date_local: '2026-01-02T00:00:00Z',
        gear_id: 'g1',
        private_note: '',
      },
    ] as any[];
    const incoming = [
      {
        id: 1,
        name: 'New',
        distance: 1500,
        moving_time: 150,
        type: 'Ride',
        start_date_local: '2026-01-03T00:00:00Z',
        gear_id: 'g1',
        private_note: '',
      },
    ] as any[];

    const merged = mergeActivities(incoming as any, existing as any);
    expect(merged).toHaveLength(2);
    expect(merged.find((a) => a.id === 1)?.name).toBe('New');
    expect(merged[0].start_date_local).toBe('2026-01-03T00:00:00Z');
  });

  it('merges gear stats summing metrics for duplicated gear ids', () => {
    const previous = [
      {
        id: 'g1',
        name: 'Bike',
        distance: 1000,
        movingTime: 100,
        activityType: 'Ride',
        count: 1,
        equipments: [{ id: 'chain', caption: '', show: '' }],
      },
    ] as any[];
    const incoming = [
      {
        id: 'g1',
        name: 'Bike',
        distance: 2000,
        movingTime: 200,
        activityType: 'Ride',
        count: 2,
        equipments: [{ id: 'tire', caption: '', show: '' }],
      },
      {
        id: 'g2',
        name: 'Road',
        distance: 500,
        movingTime: 50,
        activityType: 'Ride',
        count: 1,
        equipments: [],
      },
    ] as any[];

    const result = mergeGearStats(previous as any, incoming as any);
    expect(result).toHaveLength(2);
    const g1 = result.find((g) => g.id === 'g1')!;
    expect(g1.distance).toBe(3000);
    expect(g1.movingTime).toBe(300);
    expect(g1.count).toBe(3);
    expect(g1.equipments).toHaveLength(2);
  });

  it('saveRemote returns success on 2xx response', async () => {
    mocks.mockPost.mockResolvedValueOnce({ status: 200, statusText: 'OK' });
    const result = await saveRemote('key-1', { foo: 'bar' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ foo: 'bar' });
    expect(mocks.mockLoggerInfo).toHaveBeenCalledTimes(1);
  });

  it('saveRemote returns failure for invalid input', async () => {
    const result = await saveRemote('', { foo: 'bar' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Dados inválidos');
    expect(mocks.mockLoggerError).toHaveBeenCalledTimes(1);
  });
});
