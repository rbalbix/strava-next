import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  loggerWarn: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('../../../src/services/redis', () => ({
  default: {
    get: (...args: unknown[]) => mocks.redisGet(...args),
    set: (...args: unknown[]) => mocks.redisSet(...args),
  },
}));

vi.mock('../../../src/services/logger', () => ({
  getLogger: () => ({
    warn: mocks.loggerWarn,
    info: mocks.loggerInfo,
    error: mocks.loggerError,
  }),
}));

import {
  BASELINE_CACHE_TTL_SECONDS,
  getAthlete,
  getAthleteStats,
} from '../../../src/services/athlete';

function createStrava() {
  return {
    athletes: {
      getLoggedInAthlete: vi.fn().mockResolvedValue({ id: 123, username: 'rider' }),
      getStats: vi.fn().mockResolvedValue({ all_ride_totals: { count: 10 } }),
    },
  } as any;
}

describe('athlete service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAthlete returns logged in athlete from strava client', async () => {
    const strava = createStrava();

    const result = await getAthlete(strava);

    expect(result).toEqual({ id: 123, username: 'rider' });
    expect(strava.athletes.getLoggedInAthlete).toHaveBeenCalledTimes(1);
    // Sem athleteId não há como montar a chave de cache: nada de Redis.
    expect(mocks.redisGet).not.toHaveBeenCalled();
    expect(mocks.redisSet).not.toHaveBeenCalled();
  });

  it('getAthlete serves from the 60s baseline cache without calling Strava', async () => {
    const strava = createStrava();
    const cached = { id: 123, username: 'from-cache' };

    mocks.redisGet.mockResolvedValueOnce(cached);

    const result = await getAthlete(strava, 123);

    expect(result).toEqual(cached);
    expect(strava.athletes.getLoggedInAthlete).not.toHaveBeenCalled();
    expect(mocks.redisGet).toHaveBeenCalledWith('strava:athlete-cache:123');
    expect(mocks.redisSet).not.toHaveBeenCalled();
  });

  it('getAthlete falls back to Strava on cache miss and warms the cache', async () => {
    const strava = createStrava();
    mocks.redisGet.mockResolvedValueOnce(null);

    const result = await getAthlete(strava, 123);

    expect(result).toEqual({ id: 123, username: 'rider' });
    expect(strava.athletes.getLoggedInAthlete).toHaveBeenCalledTimes(1);
    expect(mocks.redisSet).toHaveBeenCalledWith(
      'strava:athlete-cache:123',
      { id: 123, username: 'rider' },
      { ex: BASELINE_CACHE_TTL_SECONDS },
    );
    expect(BASELINE_CACHE_TTL_SECONDS).toBe(60);
    expect(mocks.loggerWarn).not.toHaveBeenCalled();
  });

  it('getAthlete ignores a malformed cache entry and calls Strava', async () => {
    const strava = createStrava();
    mocks.redisGet.mockResolvedValueOnce({ nope: true });

    const result = await getAthlete(strava, 123);
    expect(result).toEqual({ id: 123, username: 'rider' });

    // Entrada não-objeto (ex.: string mal gravada) também cai no Strava.
    mocks.redisGet.mockResolvedValueOnce('garbage');
    const result2 = await getAthlete(strava, 123);
    expect(result2).toEqual({ id: 123, username: 'rider' });

    expect(strava.athletes.getLoggedInAthlete).toHaveBeenCalledTimes(2);
  });

  it('getAthlete survives cache read/write failures (best-effort)', async () => {
    const strava = createStrava();
    mocks.redisGet.mockRejectedValueOnce(new Error('redis read down'));

    const readFailure = await getAthlete(strava, 123);
    expect(readFailure).toEqual({ id: 123, username: 'rider' });
    expect(mocks.loggerWarn).toHaveBeenCalledTimes(1);

    mocks.redisSet.mockRejectedValueOnce(new Error('redis write down'));

    const writeFailure = await getAthlete(strava, 123);
    expect(writeFailure).toEqual({ id: 123, username: 'rider' });
    expect(mocks.loggerWarn).toHaveBeenCalledTimes(2);
    // Cache nunca pode derrubar a chamada real.
    expect(strava.athletes.getLoggedInAthlete).toHaveBeenCalledTimes(2);
  });

  it('getAthleteStats requests stats using athlete id', async () => {
    const strava = createStrava();
    mocks.redisGet.mockResolvedValueOnce(null);

    const result = await getAthleteStats(strava, { id: 456 } as any);

    expect(result).toEqual({ all_ride_totals: { count: 10 } });
    expect(strava.athletes.getStats).toHaveBeenCalledWith({ id: 456 });
    expect(mocks.redisSet).toHaveBeenCalledWith(
      'strava:athlete-stats-cache:456',
      { all_ride_totals: { count: 10 } },
      { ex: BASELINE_CACHE_TTL_SECONDS },
    );
  });

  it('getAthleteStats serves from cache and survives cache failures', async () => {
    const strava = createStrava();

    mocks.redisGet.mockResolvedValueOnce({ all_ride_totals: { count: 99 } });
    const cached = await getAthleteStats(strava, { id: 456 } as any);
    expect(cached).toEqual({ all_ride_totals: { count: 99 } });
    expect(strava.athletes.getStats).not.toHaveBeenCalled();

    mocks.redisGet.mockRejectedValueOnce(new Error('redis read down'));
    const afterReadFailure = await getAthleteStats(strava, { id: 456 } as any);
    expect(afterReadFailure).toEqual({ all_ride_totals: { count: 10 } });
    expect(strava.athletes.getStats).toHaveBeenCalledTimes(1);

    mocks.redisGet.mockResolvedValueOnce(null);
    mocks.redisSet.mockRejectedValueOnce(new Error('redis write down'));
    const afterWriteFailure = await getAthleteStats(strava, { id: 456 } as any);
    expect(afterWriteFailure).toEqual({ all_ride_totals: { count: 10 } });

    // Cache malformado (não-objeto) também cai no Strava.
    mocks.redisGet.mockResolvedValueOnce('garbage');
    const afterGarbage = await getAthleteStats(strava, { id: 456 } as any);
    expect(afterGarbage).toEqual({ all_ride_totals: { count: 10 } });

    expect(strava.athletes.getStats).toHaveBeenCalledTimes(3);
    // 2 falhas de cache (leitura + escrita) → 2 warnings, nenhum erro.
    expect(mocks.loggerWarn).toHaveBeenCalledTimes(2);
    expect(mocks.loggerError).not.toHaveBeenCalled();
  });
});
