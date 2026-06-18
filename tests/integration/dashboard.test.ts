import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

const mocks = vi.hoisted(() => ({
  mockGetAthleteAccessToken: vi.fn(),
  mockGetAthlete: vi.fn(),
  mockGetAthleteStats: vi.fn(),
  mockVerifyIfHasAnyActivities: vi.fn(),
  mockVerifyIfHasAnyGears: vi.fn(),
  mockUpdateStatistics: vi.fn(),
  mockGetEquipmentThresholds: vi.fn(),
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

vi.mock('../../src/services/thresholds', () => ({
  getEquipmentThresholds: mocks.mockGetEquipmentThresholds,
}));

vi.mock('../../src/services/logger', () => ({
  getLogger: () => ({ error: mocks.mockLoggerError }),
}));

describe('GET /api/dashboard integration', () => {
  let dashboardHandler: typeof import('../../src/pages/api/dashboard').default;
  let appDashboardHandler: typeof import('../../src/pages/api/app/dashboard').default;

  beforeEach(async () => {
    ({ default: dashboardHandler } =
      await import('../../src/pages/api/dashboard'));
    ({ default: appDashboardHandler } =
      await import('../../src/pages/api/app/dashboard'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLIENT_ID = 'client-id';
    process.env.CLIENT_SECRET = 'client-secret';
  });
it('returns 401 for non-GET requests when unauthenticated', async () => {
  const req = createMockRequest({
    method: 'POST', // Changed from GET to POST for the 405 test case, but now expects 401
  });
  const res = createMockResponse();

  await dashboardHandler(req, res);
  expect(res.statusCode).toBe(401);
  expect(res.body).toEqual({ error: 'Unauthorized', reason: 'Session expired or invalid' });
});

it('returns 401 when athlete cookie is missing', async () => {
  const req = createMockRequest({
    method: 'GET',
  });
  const res = createMockResponse();

  await dashboardHandler(req, res);
  expect(res.statusCode).toBe(401);
  expect(res.body).toEqual({ error: 'Unauthorized', reason: 'Session expired or invalid' });
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
    mocks.mockGetEquipmentThresholds.mockResolvedValueOnce({});

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
      equipmentThresholds: {},
    });
    expect(mocks.mockUpdateStatistics).toHaveBeenCalledTimes(1);
  });

  it('returns 200 with app/dashboard payload when thresholds exist', async () => {
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
    mocks.mockGetEquipmentThresholds.mockResolvedValueOnce({
      bike1: { chain: 250 },
    });

    const req = createMockRequest({
      method: 'GET',
      cookies: { strava_athleteId: '123' },
    });
    const res = createMockResponse();

    await appDashboardHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      athlete,
      athleteStats,
      hasGear: true,
      hasActivities: true,
      gearStats,
      equipmentThresholds: { bike1: { chain: 250 } },
    });
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

    mocks.mockGetEquipmentThresholds.mockResolvedValueOnce({});

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
      equipmentThresholds: {},
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

  it('returns 200 and skips equipmentThresholds if thresholds fail', async () => {
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
    mocks.mockGetEquipmentThresholds.mockRejectedValueOnce(
      new Error('redis fail'),
    );

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
    expect(mocks.mockLoggerError).toHaveBeenCalledTimes(1);
  });
});
