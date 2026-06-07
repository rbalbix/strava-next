import { describe, expect, it } from 'vitest';
import { REDIS_KEYS } from '../../../src/config/index';

describe('config REDIS_KEYS', () => {
  it('exports equipmentThresholds as a function that builds the correct Redis key', () => {
    expect(REDIS_KEYS.equipmentThresholds(123)).toBe(
      'strava:equipment-thresholds:123',
    );
  });
});
