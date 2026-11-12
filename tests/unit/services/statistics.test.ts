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

  it('registers pair items and suppresses single related components', () => {
    const activities = [
      {
        id: 2,
        name: '* pair components',
        distance: 1500,
        moving_time: 150,
        type: 'Ride',
        start_date_local: '2026-01-05T00:00:00Z',
        gear_id: 'bike-1',
        private_note: 'brakes suspension newshock review',
      },
      {
        id: 1,
        name: '* single components',
        distance: 500,
        moving_time: 50,
        type: 'Ride',
        start_date_local: '2026-01-04T00:00:00Z',
        gear_id: 'bike-1',
        private_note:
          'frontbrake rearbrake suspareview suspakit shockreview shockkit',
      },
    ] as any[];
    const gears = [{ id: 'bike-1', name: 'Bike One' }] as any[];

    const result = createStatistics(activities as any, gears as any);
    const ids = result[0]?.equipments.map((e) => e.id) ?? [];

    expect(ids).toContain('brakes');
    expect(ids).not.toContain('frontbrake');
    expect(ids).not.toContain('rearbrake');
    expect(ids).toContain('suspension');
    expect(ids).not.toContain('suspareview');
    expect(ids).not.toContain('suspakit');
    expect(ids).toContain('newshock');
    expect(ids).not.toContain('shockreview');
    expect(ids).not.toContain('shockkit');
    expect(ids).toContain('review');
  });
});

describe('statistics.createStatistics D14 — matching tolerante', () => {
  const gears = [{ id: 'bike-1', name: 'Bike One' }] as any[];

  function idsFor(privateNote: string) {
    const activities = [
      {
        id: 1,
        name: '* service',
        distance: 1000,
        moving_time: 100,
        type: 'Ride',
        start_date_local: '2026-01-03T00:00:00Z',
        gear_id: 'bike-1',
        private_note: privateNote,
      },
    ] as any[];

    const result = createStatistics(activities as any, gears as any);
    return (result[0]?.equipments ?? []).map((e) => e.id);
  }

  it('matches case-insensitive (CHAIN registra)', () => {
    expect(idsFor('CHAIN')).toContain('chain');
    expect(idsFor('Chain')).toContain('chain');
  });

  it('matches PT synonyms (corrente registra chain)', () => {
    expect(idsFor('troquei a corrente')).toContain('chain');
    expect(idsFor('freios velhos')).toContain('brakes');
    expect(idsFor('pneu furado')).toContain('tires');
  });

  it('superstrings still register and stay silent (chainn registra chain)', () => {
    expect(idsFor('chainn')).toContain('chain');
    expect(idsFor('reviewx lub')).toContain('lub');
  });

  it('isolated PT review form registers review', () => {
    expect(idsFor('revisão completa')).toContain('review');
    expect(idsFor('review')).toContain('review');
  });

  it('review guard holds for compound codes (suspareview/shockreview sozinhos)', () => {
    expect(idsFor('suspareview')).toContain('suspareview');
    expect(idsFor('suspareview')).not.toContain('review');
    expect(idsFor('shockreview')).not.toContain('review');
    expect(idsFor('reviewx')).not.toContain('review');
  });

  it('sorts activities across gears without mixing them', () => {
    const activities = [
      {
        id: 2,
        name: 'Ride 2',
        distance: 2000,
        moving_time: 200,
        type: 'Ride',
        start_date_local: '2026-01-02T00:00:00Z',
        gear_id: 'bike-2',
        private_note: '',
      },
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
    ] as any[];

    const result = createStatistics(activities as any, [
      { id: 'bike-1', name: 'Bike One' },
      { id: 'bike-2', name: 'Bike Two' },
    ] as any);

    expect(result.map((gear) => gear.id)).toEqual(['bike-1', 'bike-2']);
    expect(result[0]).toMatchObject({ count: 1, distance: 1000 });
    expect(result[1]).toMatchObject({ count: 1, distance: 2000 });
  });

  it('registers nothing when a * activity has no private note', () => {
    expect(idsFor(undefined as any)).toEqual([]);
  });
});
