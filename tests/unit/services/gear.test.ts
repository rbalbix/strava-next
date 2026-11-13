import { describe, expect, it } from 'vitest';
import {
  getGears,
  orderGearsByLastUse,
  verifyIfHasAnyGears,
} from '../../../src/services/gear';

describe('gear service', () => {
  it('getGears merges bikes and shoes arrays', () => {
    const athlete = {
      bikes: [{ id: 'bike-1' }, { id: 'bike-2' }],
      shoes: [{ id: 'shoe-1' }],
    } as any;

    const result = getGears(athlete);

    expect(result).toEqual([{ id: 'bike-1' }, { id: 'bike-2' }, { id: 'shoe-1' }]);
  });

  it('verifyIfHasAnyGears returns true when athlete has gear', () => {
    const athlete = {
      bikes: [{ id: 'bike-1' }],
      shoes: [],
    } as any;

    expect(verifyIfHasAnyGears(athlete)).toBe(true);
  });

  it('verifyIfHasAnyGears returns false when athlete has no gear', () => {
    const athlete = {
      bikes: [],
      shoes: [],
    } as any;

    expect(verifyIfHasAnyGears(athlete)).toBe(false);
  });

  it('orderGearsByLastUse keeps bikes first, most recent first in each group', () => {
    const bikes = [{ id: 'bike-old' }, { id: 'bike-new' }];
    const shoes = [{ id: 'shoe-old' }, { id: 'shoe-new' }];
    const activities = [
      { gear_id: 'bike-old', start_date_local: '2026-01-01T00:00:00Z' },
      { gear_id: 'bike-new', start_date_local: '2026-06-01T00:00:00Z' },
      { gear_id: 'shoe-old', start_date_local: '2026-09-01T00:00:00Z' },
      { gear_id: 'shoe-new', start_date_local: '2026-03-01T00:00:00Z' },
      { gear_id: null, start_date_local: '2026-12-01T00:00:00Z' },
    ] as any[];

    const result = orderGearsByLastUse(bikes as any, shoes as any, activities);

    expect(result.map((gear) => gear.id)).toEqual([
      'bike-new',
      'bike-old',
      'shoe-old',
      'shoe-new',
    ]);
  });

  it('orderGearsByLastUse puts gears without activities at the end of their group', () => {
    const bikes = [{ id: 'bike-unused' }, { id: 'bike-used' }];
    const shoes = [{ id: 'shoe-unused' }, { id: 'shoe-used' }];
    const activities = [
      { gear_id: 'bike-used', start_date_local: '2026-05-01T00:00:00Z' },
      { gear_id: 'shoe-used', start_date_local: '2026-05-01T00:00:00Z' },
    ] as any[];

    const result = orderGearsByLastUse(bikes as any, shoes as any, activities);

    // bike sem atividade fecha as bikes (antes dos tênis);
    // tênis sem atividade fecha a lista.
    expect(result.map((gear) => gear.id)).toEqual([
      'bike-used',
      'bike-unused',
      'shoe-used',
      'shoe-unused',
    ]);
  });

  it('orderGearsByLastUse uses the most recent activity when a gear has many', () => {
    const bikes = [{ id: 'bike-a' }, { id: 'bike-b' }];
    const activities = [
      { gear_id: 'bike-a', start_date_local: '2026-01-01T00:00:00Z' },
      { gear_id: 'bike-a', start_date_local: '2026-09-01T00:00:00Z' },
      // mais antiga que a anterior: é ignorada (não regride a data)
      { gear_id: 'bike-a', start_date_local: '2025-06-01T00:00:00Z' },
      { gear_id: 'bike-b', start_date_local: '2026-05-01T00:00:00Z' },
    ] as any[];

    const result = orderGearsByLastUse(bikes as any, [], activities);

    expect(result.map((gear) => gear.id)).toEqual(['bike-a', 'bike-b']);
  });

  it('orderGearsByLastUse keeps Strava order on ties (stable sort)', () => {
    const bikes = [{ id: 'bike-a' }, { id: 'bike-b' }];
    const activities = [
      { gear_id: 'bike-a', start_date_local: '2026-05-01T00:00:00Z' },
      { gear_id: 'bike-b', start_date_local: '2026-05-01T00:00:00Z' },
    ] as any[];

    const result = orderGearsByLastUse(bikes as any, [], activities);

    expect(result.map((gear) => gear.id)).toEqual(['bike-a', 'bike-b']);
  });
});
