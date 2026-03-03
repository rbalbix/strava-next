import { describe, expect, it, vi } from 'vitest';
import { getAthlete, getAthleteStats } from '../../../src/services/athlete';

describe('athlete service', () => {
  it('getAthlete returns logged in athlete from strava client', async () => {
    const athlete = { id: 123, username: 'rider' };
    const strava = {
      athletes: {
        getLoggedInAthlete: vi.fn().mockResolvedValue(athlete),
      },
    } as any;

    const result = await getAthlete(strava);

    expect(result).toEqual(athlete);
    expect(strava.athletes.getLoggedInAthlete).toHaveBeenCalledTimes(1);
  });

  it('getAthleteStats requests stats using athlete id', async () => {
    const stats = { all_ride_totals: { count: 10 } };
    const strava = {
      athletes: {
        getStats: vi.fn().mockResolvedValue(stats),
      },
    } as any;

    const result = await getAthleteStats(strava, { id: 456 } as any);

    expect(result).toEqual(stats);
    expect(strava.athletes.getStats).toHaveBeenCalledWith({ id: 456 });
  });
});
