import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

const mocks = vi.hoisted(() => ({
  mockGetAthleteAccessToken: vi.fn(),
  mockGetAthlete: vi.fn(),
  mockGetAthleteStats: vi.fn(),
  mockVerifyIfHasAnyActivities: vi.fn(),
  mockVerifyIfHasAnyGears: vi.fn(),
  mockUpdateStatistics: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('strava', () => ({
  Strava: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../src/services/strava-auth', () => ({
  getAthleteAccessToken: mocks.mockGetAthleteAccessToken,
}));

vi.mock('../../src/services/athlete', () => ({
  getAthlete: mocks.mockGetAthlete,
  getAthleteStats: mocks.mockGetAthleteStats,
}));

vi.mock('../../src/services/activity', () => ({
  verifyIfHasAnyActivities: mocks.mockVerifyIfHasAnyActivities,
}));

vi.mock('../../src/services/gear', () => ({
  verifyIfHasAnyGears: mocks.mockVerifyIfHasAnyGears,
}));

vi.mock('../../src/services/statistics', () => ({
  updateStatistics: mocks.mockUpdateStatistics,
}));

vi.mock('../../src/services/logger', () => ({
  getLogger: () => ({ error: mocks.mockLoggerError }),
}));

describe('GET /api/dashboard integration', () => {
  let dashboardHandler: typeof import('../../src/pages/api/dashboard').default;

  beforeEach(async () => {
    ({ default: dashboardHandler } = await import('../../src/pages/api/dashboard'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLIENT_ID = 'client-id';
    process.env.CLIENT_SECRET = 'client-secret';
  });

  it('returns 405 for non-GET requests', async () => {
    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await dashboardHandler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['GET']);
    expect(res.body).toEqual({ error: 'Method not allowed' });
  });

  it('returns 401 when athlete cookie is missing', async () => {
    const req = createMockRequest({ method: 'GET', cookies: {} });
    const res = createMockResponse();

    await dashboardHandler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when tokens are missing', async () => {
    mocks.mockGetAthleteAccessToken.mockResolvedValueOnce(null);
    const req = createMockRequest({
      method: 'GET',
      cookies: { strava_athleteId: '123' },
    });
    const res = createMockResponse();

    await dashboardHandler(req, res);

    expect(mocks.mockGetAthleteAccessToken).toHaveBeenCalledWith(123);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Missing auth tokens' });
  });

  it('returns 200 with dashboard payload when athlete has gear and activities', async () => {
    const athlete = { id: 123, name: 'Athlete Name' };
    const athleteStats = { all_ride_totals: { count: 10 } };
    const gearStats = [{ id: 'bike-1', count: 1 }];

    mocks.mockGetAthleteAccessToken.mockResolvedValueOnce({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: 9999999999,
    });
    mocks.mockGetAthlete.mockResolvedValueOnce(athlete);
    mocks.mockGetAthleteStats.mockResolvedValueOnce(athleteStats);
    mocks.mockVerifyIfHasAnyGears.mockReturnValueOnce(true);
    mocks.mockVerifyIfHasAnyActivities.mockResolvedValueOnce(true);
    mocks.mockUpdateStatistics.mockResolvedValueOnce(gearStats);

    const req = createMockRequest({
      method: 'GET',
      cookies: { strava_athleteId: '123' },
    });
    const res = createMockResponse();

    await dashboardHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      athlete,
      athleteStats,
      hasGear: true,
      hasActivities: true,
      gearStats,
    });
    expect(mocks.mockUpdateStatistics).toHaveBeenCalledTimes(1);
  });

  it('returns empty gearStats when athlete has no gear or activities', async () => {
    const athlete = { id: 123, name: 'Athlete Name' };
    const athleteStats = { all_ride_totals: { count: 0 } };

    mocks.mockGetAthleteAccessToken.mockResolvedValueOnce({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: 9999999999,
    });
    mocks.mockGetAthlete.mockResolvedValueOnce(athlete);
    mocks.mockGetAthleteStats.mockResolvedValueOnce(athleteStats);
    mocks.mockVerifyIfHasAnyGears.mockReturnValueOnce(false);
    mocks.mockVerifyIfHasAnyActivities.mockResolvedValueOnce(false);

    const req = createMockRequest({
      method: 'GET',
      cookies: { strava_athleteId: '123' },
    });
    const res = createMockResponse();

    await dashboardHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      athlete,
      athleteStats,
      hasGear: false,
      hasActivities: false,
      gearStats: [],
    });
    expect(mocks.mockUpdateStatistics).not.toHaveBeenCalled();
  });

  it('returns 500 when CLIENT_ID or CLIENT_SECRET is missing', async () => {
    delete process.env.CLIENT_ID;
    delete process.env.CLIENT_SECRET;
    mocks.mockGetAthleteAccessToken.mockResolvedValueOnce({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: 9999999999,
    });

    const req = createMockRequest({
      method: 'GET',
      cookies: { strava_athleteId: '123' },
    });
    const res = createMockResponse();

    await dashboardHandler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Server auth config missing' });
  });

  it('returns 500 when an unexpected error happens', async () => {
    mocks.mockGetAthleteAccessToken.mockRejectedValueOnce(new Error('boom'));
    const req = createMockRequest({
      method: 'GET',
      cookies: { strava_athleteId: '123' },
    });
    const res = createMockResponse();

    await dashboardHandler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(mocks.mockLoggerError).toHaveBeenCalledTimes(1);
  });
});
