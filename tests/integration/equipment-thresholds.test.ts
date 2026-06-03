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
    ({ default: handler } = await import('../../src/pages/api/app/equipment-thresholds'));
    vi.clearAllMocks();
  });

  it('returns 405 for unsupported methods', async () => {
    const req = createMockRequest({ method: 'DELETE' });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['GET', 'POST']);
    expect(res.body).toEqual({ error: 'Method not allowed' });
  });

  it('returns 401 when athlete cookie is missing', async () => {
    const req = createMockRequest({ method: 'GET', cookies: {} });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 200 with thresholds on GET when authenticated', async () => {
    mocks.mockGetEquipmentThresholds.mockResolvedValueOnce({
      bikeA: { chain: 120 },
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
      equipmentThresholds: { bikeA: { chain: 120 } },
    });
  });

  it('returns 200 and persists updated threshold on POST', async () => {
    mocks.mockSaveEquipmentThreshold.mockResolvedValueOnce({
      bikeA: { chain: 130 },
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
      130,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      equipmentThresholds: { bikeA: { chain: 130 } },
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
});
