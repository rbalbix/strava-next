import { describe, expect, it } from 'vitest';
import {
  equipmentMatches,
  findUnresolvedCases,
  normalizeNote,
  toUnrecognizedCodes,
  tokenizeNote,
} from '../../../src/services/noteCodes';

// D14 — varredura tolerante: espelha o registro de createStatistics e só
// reporta o que NÃO registrou nada e está a ≤2 edições de um código.

function makeActivity(
  overrides: Partial<{
    id: number;
    name: string;
    private_note: string;
    gear_id: string;
    start_date_local: string;
  }> = {},
) {
  return {
    id: 1,
    name: '* Ride',
    distance: 1000,
    moving_time: 100,
    type: 'Ride',
    start_date_local: '2026-01-01T00:00:00Z',
    gear_id: 'bike-1',
    private_note: '',
    ...overrides,
  } as any;
}

describe('noteCodes.normalizeNote / tokenizeNote', () => {
  it('lowercases and strips accents (case-insensitive é pedido do proprietário)', () => {
    expect(normalizeNote('Chain')).toBe('chain');
    expect(normalizeNote('CHAIN')).toBe('chain');
    expect(normalizeNote('LUBRIFICAÇÃO')).toBe('lubrificacao');
    expect(normalizeNote('Revisão')).toBe('revisao');
  });

  it('tokenizes on word boundaries keeping punctuation out', () => {
    expect(tokenizeNote('troquei a corrente!')).toEqual([
      'troquei',
      'a',
      'corrente',
    ]);
    expect(tokenizeNote('')).toEqual([]);
  });
});

describe('noteCodes.equipmentMatches', () => {
  it('keeps substring semantics with case-insensitive match', () => {
    expect(equipmentMatches('chain', ['chain'], 'chain')).toBe(true);
    expect(equipmentMatches('chainn', ['chainn'], 'chain')).toBe(true);
    expect(equipmentMatches('troquei a corrente', ['troquei', 'a', 'corrente'], 'chain')).toBe(true);
    expect(equipmentMatches('', [], 'chain')).toBe(false);
  });

  it('honors the isolated-review guard for EN and PT forms', () => {
    expect(equipmentMatches('review', ['review'], 'review')).toBe(true);
    expect(equipmentMatches('revisao', ['revisao'], 'review')).toBe(true);
    // substring bate, mas não está isolado → não registra review
    expect(equipmentMatches('suspareview', ['suspareview'], 'review')).toBe(false);
    expect(equipmentMatches('shockreview', ['shockreview'], 'review')).toBe(false);
    expect(equipmentMatches('reviewx', ['reviewx'], 'review')).toBe(false);
    // …mas o próprio suspareview/shockreview registra
    expect(equipmentMatches('suspareview', ['suspareview'], 'suspareview')).toBe(true);
    expect(equipmentMatches('shockreview', ['shockreview'], 'shockreview')).toBe(true);
  });
});

describe('noteCodes.findUnresolvedCases', () => {
  it('stays silent when the note registered something (superstring e case)', () => {
    expect(findUnresolvedCases([makeActivity({ private_note: 'chainn' })])).toEqual([]);
    expect(findUnresolvedCases([makeActivity({ private_note: 'CHAIN' })])).toEqual([]);
    expect(findUnresolvedCases([makeActivity({ private_note: 'corrente' })])).toEqual([]);
    expect(findUnresolvedCases([makeActivity({ private_note: 'shockreview' })])).toEqual([]);
    expect(findUnresolvedCases([makeActivity({ private_note: 'revisão' })])).toEqual([]);
    expect(findUnresolvedCases([makeActivity({ private_note: 'review' })])).toEqual([]);
  });

  it('reports near-miss typos with the closest suggestion', () => {
    const cases = findUnresolvedCases([
      makeActivity({ id: 7, private_note: 'troquei a chian' }),
    ]);

    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({
      activityId: 7,
      gearId: 'bike-1',
      startDate: '2026-01-01T00:00:00Z',
      word: 'chian',
      suggestion: 'chain',
    });
  });

  it('reports reviewx/reviews (não geram registro de verdade — decisão do proprietário)', () => {
    expect(
      findUnresolvedCases([makeActivity({ private_note: 'reviewx' })])[0],
    ).toMatchObject({ word: 'reviewx', suggestion: 'review' });
    expect(
      findUnresolvedCases([makeActivity({ private_note: 'reviews' })])[0],
    ).toMatchObject({ word: 'reviews', suggestion: 'review' });
  });

  it('stays silent on free text and on words shorter than 4 chars', () => {
    expect(findUnresolvedCases([makeActivity({ private_note: 'troquei a bike hoje' })])).toEqual([]);
    expect(findUnresolvedCases([makeActivity({ private_note: 'cha' })])).toEqual([]);
  });

  it('only scans activities with * in the name and a private note', () => {
    expect(
      findUnresolvedCases([makeActivity({ name: 'Ride', private_note: 'chian' })]),
    ).toEqual([]);
    expect(
      findUnresolvedCases([makeActivity({ name: '* Ride', private_note: '' })]),
    ).toEqual([]);
    // atividade sem campo name (opcional) — o guard `name?.` cobre
    expect(
      findUnresolvedCases([
        {
          id: 9,
          distance: 1,
          moving_time: 1,
          type: 'Ride',
          start_date_local: '2026-01-01T00:00:00Z',
          gear_id: 'bike-1',
          private_note: 'chian',
        } as any,
      ]),
    ).toEqual([]);
  });
});

describe('noteCodes.toUnrecognizedCodes', () => {
  it('attaches gear names and drops cases from unknown gears', () => {
    const cases = findUnresolvedCases([
      makeActivity({ id: 1, private_note: 'chian' }),
      makeActivity({ id: 2, gear_id: 'ghost', private_note: 'chian' }),
    ]);

    const codes = toUnrecognizedCodes(cases, [{ id: 'bike-1', name: 'Bike A' }]);

    expect(codes).toHaveLength(1);
    expect(codes[0]).toMatchObject({
      activityId: 1,
      gearName: 'Bike A',
      word: 'chian',
      suggestion: 'chain',
    });
  });

  it('keeps the same word in two activities as two lines (links distintos)', () => {
    const cases = findUnresolvedCases([
      makeActivity({ id: 1, start_date_local: '2026-01-05T00:00:00Z', private_note: 'chian' }),
      makeActivity({ id: 2, start_date_local: '2026-01-10T00:00:00Z', private_note: 'chian' }),
    ]);

    const codes = toUnrecognizedCodes(cases, [{ id: 'bike-1', name: 'Bike A' }]);

    expect(codes).toHaveLength(2);
    expect(codes.map((code) => code.activityId)).toEqual([2, 1]); // data desc
  });

  it('dedupes repeated words of the same activity', () => {
    const cases = findUnresolvedCases([
      makeActivity({ id: 1, private_note: 'chian depois chian' }),
    ]);

    const codes = toUnrecognizedCodes(cases, [{ id: 'bike-1', name: 'Bike A' }]);

    expect(codes).toHaveLength(1);
  });

  it('sorts by date desc then word asc and keeps accented display in suggestions', () => {
    const cases = findUnresolvedCases([
      makeActivity({ id: 1, private_note: 'reviw chian' }),
      makeActivity({ id: 1, private_note: 'revisaox' }),
    ]);

    const codes = toUnrecognizedCodes(cases, [{ id: 'bike-1', name: 'Bike A' }]);

    expect(codes.map((code) => code.word)).toEqual(['chian', 'revisaox', 'reviw']);
    expect(codes[1].suggestion).toBe('revisão'); // forma crua, acentuada
  });
});
