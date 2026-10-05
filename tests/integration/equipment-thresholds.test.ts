import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

const mocks = vi.hoisted(() => ({
  mockGetEquipmentThresholds: vi.fn(),
  mockSaveEquipmentThreshold: vi.fn(),
}));

vi.mock('../../src/services/thresholds', () => ({
  getEquipmentThresholds: mocks.mockGetEquipmentThresholds,
  saveEquipmentThreshold: mocks.mockSaveEquipmentThreshold,
}));

describe('API /api/app/equipment-thresholds', () => {
  let handler: typeof import('../../src/pages/api/app/equipment-thresholds').default;

  beforeEach(async () => {
    ({ default: handler } =
      await import('../../src/pages/api/app/equipment-thresholds'));
    vi.clearAllMocks();
  });
it('returns 401 for unsupported methods when unauthenticated', async () => {
  const req = createMockRequest({
    method: 'PUT', // Changed from GET to PUT for the 405 test case, but now expects 401
  });
  const res = createMockResponse();

  await handler(req, res);
  expect(res.statusCode).toBe(401);
  expect(res.body).toEqual({ error: 'Unauthorized', reason: 'Session expired or invalid' });
});

it('returns 401 when athlete cookie is missing', async () => {
  const req = createMockRequest({
    method: 'GET',
  });
  const res = createMockResponse();

  await handler(req, res);
  expect(res.statusCode).toBe(401);
  expect(res.body).toEqual({ error: 'Unauthorized', reason: 'Session expired or invalid' });
});

  it('returns 401 for POST when unauthenticated', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: {
        gearId: 'bikeA',
        equipmentId: 'chain',
        thresholdKm: 130,
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: 'Unauthorized',
      reason: 'Session expired or invalid',
    });
    expect(mocks.mockSaveEquipmentThreshold).not.toHaveBeenCalled();
  });
  it('returns 200 with thresholds on GET when authenticated', async () => {
    mocks.mockGetEquipmentThresholds.mockResolvedValueOnce({
      bikeA: { chain: { value: 120, unit: 'km' } },
    });

    const req = createMockRequest({
      method: 'GET',
      cookies: { strava_athleteId: '123' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(mocks.mockGetEquipmentThresholds).toHaveBeenCalledWith(123);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      equipmentThresholds: { bikeA: { chain: { value: 120, unit: 'km' } } },
    });
  });

  it('returns 200 and defaults to kilometres when the unit is absent', async () => {
    mocks.mockSaveEquipmentThreshold.mockResolvedValueOnce({
      bikeA: { chain: { value: 130, unit: 'km' } },
    });

    const req = createMockRequest({
      method: 'POST',
      cookies: { strava_athleteId: '123' },
      body: {
        gearId: 'bikeA',
        equipmentId: 'chain',
        thresholdKm: 130,
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(mocks.mockSaveEquipmentThreshold).toHaveBeenCalledWith(
      123,
      'bikeA',
      'chain',
      { value: 130, unit: 'km' },
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      equipmentThresholds: { bikeA: { chain: { value: 130, unit: 'km' } } },
    });
  });

  it('returns 400 for invalid POST payload', async () => {
    const req = createMockRequest({
      method: 'POST',
      cookies: { strava_athleteId: '123' },
      body: {
        gearId: '',
        equipmentId: 'chain',
        thresholdKm: -1,
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid payload' });
  });

  it('returns 200 and persists the chosen unit on POST', async () => {
    mocks.mockSaveEquipmentThreshold.mockResolvedValueOnce({
      bikeA: { suspension: { value: 50, unit: 'h' } },
    });

    const req = createMockRequest({
      method: 'POST',
      cookies: { strava_athleteId: '123' },
      body: {
        gearId: 'bikeA',
        equipmentId: 'suspension',
        thresholdKm: 50,
        unit: 'h',
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(mocks.mockSaveEquipmentThreshold).toHaveBeenCalledWith(
      123,
      'bikeA',
      'suspension',
      { value: 50, unit: 'h' },
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      equipmentThresholds: { bikeA: { suspension: { value: 50, unit: 'h' } } },
    });
  });

  it('returns 400 when the unit is outside km/h', async () => {
    const req = createMockRequest({
      method: 'POST',
      cookies: { strava_athleteId: '123' },
      body: {
        gearId: 'bikeA',
        equipmentId: 'chain',
        thresholdKm: 130,
        unit: 'minutos',
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid payload' });
    expect(mocks.mockSaveEquipmentThreshold).not.toHaveBeenCalled();
  });

  it('returns 400 when the payload contains an unknown field', async () => {
    const req = createMockRequest({
      method: 'POST',
      cookies: { strava_athleteId: '123' },
      body: {
        gearId: 'bikeA',
        equipmentId: 'chain',
        thresholdKm: 130,
        unexpected: true,
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid payload' });
    expect(mocks.mockSaveEquipmentThreshold).not.toHaveBeenCalled();
  });

  it('returns 405 with the Allow header for unsupported methods when authenticated', async () => {
    const req = createMockRequest({
      method: 'PATCH',
      cookies: { strava_athleteId: '123' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['GET', 'POST']);
    expect(mocks.mockSaveEquipmentThreshold).not.toHaveBeenCalled();
  });
});
