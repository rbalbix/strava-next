import { beforeEach, describe, expect, it, vi } from 'vitest';

// D14 — persistência do relatório: molde thresholds.ts, mas com teste
// próprio (o módulo é mockado nos testes de statistics/dashboard).

vi.mock('../../../src/services/redis', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import redis from '../../../src/services/redis';
import {
  getStoredUnrecognizedCodes,
  getUnrecognizedCodes,
  recordRefreshAttempt,
  saveUnrecognizedCodes,
} from '../../../src/services/unrecognized-codes';

const code = {
  activityId: 42,
  gearName: 'Bike A',
  startDate: '2026-11-05T10:00:00Z',
  word: 'chian',
  suggestion: 'chain',
};

describe('unrecognized-codes persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves the report under the D14 key with lastUpdated', async () => {
    vi.mocked(redis.set).mockResolvedValue('OK' as never);

    await saveUnrecognizedCodes(123, [code]);

    expect(redis.set).toHaveBeenCalledWith('strava:unrecognized-codes:123', {
      lastUpdated: expect.any(Number),
      codes: [code],
    });
  });

  it('returns the codes when the key exists', async () => {
    vi.mocked(redis.get).mockResolvedValue({
      lastUpdated: 1700000000,
      codes: [code],
    } as never);

    await expect(getUnrecognizedCodes(123)).resolves.toEqual([code]);
    expect(redis.get).toHaveBeenCalledWith('strava:unrecognized-codes:123');
  });

  it('returns null when the key is missing or malformed', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce(null as never);
    await expect(getUnrecognizedCodes(123)).resolves.toBeNull();

    vi.mocked(redis.get).mockResolvedValueOnce({
      lastUpdated: 1700000000,
    } as never);
    await expect(getUnrecognizedCodes(123)).resolves.toBeNull();

    vi.mocked(redis.get).mockResolvedValueOnce({
      lastUpdated: 1700000000,
      codes: 'not-an-array',
    } as never);
    await expect(getUnrecognizedCodes(123)).resolves.toBeNull();
  });

  it('propagates redis failures (the caller decides best-effort)', async () => {
    vi.mocked(redis.get).mockRejectedValue(new Error('redis down'));
    await expect(getUnrecognizedCodes(123)).rejects.toThrow('redis down');

    vi.mocked(redis.set).mockRejectedValue(new Error('redis down'));
    await expect(saveUnrecognizedCodes(123, [])).rejects.toThrow('redis down');
  });

  // --- D14.1: leitura completa + carimbo da tentativa de refresh ---

  it('getStoredUnrecognizedCodes returns the full record including the attempt', async () => {
    vi.mocked(redis.get).mockResolvedValue({
      lastUpdated: 1700000000,
      codes: [code],
      lastRefreshAttempt: 1700000600,
    } as never);

    await expect(getStoredUnrecognizedCodes(123)).resolves.toEqual({
      lastUpdated: 1700000000,
      codes: [code],
      lastRefreshAttempt: 1700000600,
    });
  });

  it('getStoredUnrecognizedCodes returns null when missing or malformed', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce(null as never);
    await expect(getStoredUnrecognizedCodes(123)).resolves.toBeNull();

    vi.mocked(redis.get).mockResolvedValueOnce({
      lastUpdated: 1700000000,
      codes: 'not-an-array',
    } as never);
    await expect(getStoredUnrecognizedCodes(123)).resolves.toBeNull();
  });

  it('recordRefreshAttempt stamps the attempt preserving codes and lastUpdated', async () => {
    vi.mocked(redis.set).mockResolvedValue('OK' as never);

    await recordRefreshAttempt(123, {
      lastUpdated: 1700000000,
      codes: [code],
    });

    expect(redis.set).toHaveBeenCalledWith('strava:unrecognized-codes:123', {
      lastUpdated: 1700000000,
      codes: [code],
      lastRefreshAttempt: expect.any(Number),
    });
  });

  it('recordRefreshAttempt propagates redis failures', async () => {
    vi.mocked(redis.set).mockRejectedValue(new Error('redis down'));
    await expect(
      recordRefreshAttempt(123, { lastUpdated: 1, codes: [] }),
    ).rejects.toThrow('redis down');
  });
});
