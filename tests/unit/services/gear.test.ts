import { describe, expect, it } from 'vitest';
import { getGears, verifyIfHasAnyGears } from '../../../src/services/gear';

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
});
