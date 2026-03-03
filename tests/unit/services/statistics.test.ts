import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('../../../src/services/redis', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    setex: vi.fn(),
  },
}));

import { createStatistics } from '../../../src/services/statistics';

describe('statistics.createStatistics', () => {
  it('returns one gear stat with aggregated count, distance and moving time', () => {
    const activities = [
      {
        id: 1,
        name: 'Ride 1',
        distance: 1000,
        moving_time: 100,
        type: 'Ride',
        start_date_local: '2026-01-01T00:00:00Z',
        gear_id: 'bike-1',
        private_note: '',
      },
      {
        id: 2,
        name: 'Ride 2',
        distance: 2000,
        moving_time: 200,
        type: 'Ride',
        start_date_local: '2026-01-02T00:00:00Z',
        gear_id: 'bike-1',
        private_note: '',
      },
    ] as any[];

    const gears = [{ id: 'bike-1', name: 'Bike One' }] as any[];
    const result = createStatistics(activities as any, gears as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'bike-1',
      name: 'Bike One',
      count: 2,
      distance: 3000,
      movingTime: 300,
    });
  });

  it('ignores standalone review-equipment match when "review" word is not isolated', () => {
    const activities = [
      {
        id: 1,
        name: '* service',
        distance: 1000,
        moving_time: 100,
        type: 'Ride',
        start_date_local: '2026-01-03T00:00:00Z',
        gear_id: 'bike-1',
        private_note: 'reviewx lub',
      },
    ] as any[];
    const gears = [{ id: 'bike-1', name: 'Bike One' }] as any[];

    const result = createStatistics(activities as any, gears as any);
    const equipments = result[0]?.equipments ?? [];
    const hasReview = equipments.some((e) => e.id === 'review');
    const hasLub = equipments.some((e) => e.id === 'lub');

    expect(hasReview).toBe(false);
    expect(hasLub).toBe(true);
  });

  it('marks tubeless and avoids registering tube/front/rear tube', () => {
    const activities = [
      {
        id: 1,
        name: '* tubeless',
        distance: 1500,
        moving_time: 150,
        type: 'Ride',
        start_date_local: '2026-01-04T00:00:00Z',
        gear_id: 'bike-1',
        private_note: 'tubeless tubes fronttube reartube',
      },
    ] as any[];
    const gears = [{ id: 'bike-1', name: 'Bike One' }] as any[];

    const result = createStatistics(activities as any, gears as any);
    const equipmentIds = result[0]?.equipments.map((e) => e.id) ?? [];

    expect(equipmentIds).toContain('tubeless');
    expect(equipmentIds).toContain('tubes');
    expect(equipmentIds).not.toContain('fronttube');
    expect(equipmentIds).not.toContain('reartube');
  });

  it('does not return gears without distance', () => {
    const activities = [
      {
        id: 1,
        name: 'Walk',
        distance: 0,
        moving_time: 100,
        type: 'Walk',
        start_date_local: '2026-01-01T00:00:00Z',
        gear_id: 'bike-1',
        private_note: '',
      },
    ] as any[];
    const gears = [{ id: 'bike-1', name: 'Bike One' }] as any[];

    const result = createStatistics(activities as any, gears as any);
    expect(result).toHaveLength(0);
  });
});
