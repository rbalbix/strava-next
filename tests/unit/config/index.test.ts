import { describe, expect, it } from 'vitest';
import { REDIS_KEYS, SESSION_MAX_AGE } from '../../../src/config/index';

describe('config SESSION_MAX_AGE', () => {
  it('evaluates exactly to 30 days in seconds', () => {
    expect(SESSION_MAX_AGE).toBe(2592000);
  });
});

describe('config REDIS_KEYS', () => {
  it('exports equipmentThresholds as a function that builds the correct Redis key', () => {
    expect(REDIS_KEYS.equipmentThresholds(123)).toBe(
      'strava:equipment-thresholds:123',
    );
  });
});
