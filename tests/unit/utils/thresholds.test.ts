import { describe, expect, it } from 'vitest';
import type { ThresholdEntry } from '../../../src/contracts/api';
import {
  computeThresholdState,
  formatThresholdValue,
  resolveCurrentConsumption,
} from '../../../src/utils/thresholds';

describe('threshold utils', () => {
  it('returns no-threshold when threshold is undefined', () => {
    expect(computeThresholdState(10, undefined)).toBe('no-threshold');
  });

  it('returns normal when usage is below 80%', () => {
    expect(computeThresholdState(7.9, 10)).toBe('normal');
  });

  it('returns warning when usage is at or above 80% but below 100%', () => {
    expect(computeThresholdState(8, 10)).toBe('warning');
    expect(computeThresholdState(9.9, 10)).toBe('warning');
  });

  it('returns overdue when usage reaches 100%', () => {
    expect(computeThresholdState(10, 10)).toBe('overdue');
    expect(computeThresholdState(15, 10)).toBe('overdue');
  });

  it('returns overdue for zero threshold when there is any distance', () => {
    expect(computeThresholdState(0, 0)).toBe('overdue');
    expect(computeThresholdState(1, 0)).toBe('overdue');
  });

  describe('formatThresholdValue', () => {
    it('formats kilometres with two decimal places', () => {
      expect(formatThresholdValue(5, 'km')).toBe('5,00 km');
      expect(formatThresholdValue(1234.5, 'km')).toBe('1.234,50 km');
    });

    it('formats riding hours with one decimal place', () => {
      expect(formatThresholdValue(5, 'h')).toBe('5,0 h');
      expect(formatThresholdValue(48, 'h')).toBe('48,0 h');
    });
  });

  describe('resolveCurrentConsumption', () => {
    it('returns distance in km when the limit is in kilometres', () => {
      const entry: ThresholdEntry = { value: 600, unit: 'km' };

      expect(resolveCurrentConsumption(entry, { distance: 600000 })).toBe(600);
    });

    it('returns riding hours when the limit is in hours', () => {
      const entry: ThresholdEntry = { value: 50, unit: 'h' };

      expect(resolveCurrentConsumption(entry, { movingTime: 180000 })).toBe(50);
    });

    it('returns 0 when distance is absent and the limit is in kilometres', () => {
      const entry: ThresholdEntry = { value: 600, unit: 'km' };

      expect(resolveCurrentConsumption(entry, { movingTime: 360000 })).toBe(0);
    });

    it('returns 0 when moving time is absent and the limit is in hours', () => {
      const entry: ThresholdEntry = { value: 50, unit: 'h' };

      expect(resolveCurrentConsumption(entry, { distance: 100000 })).toBe(0);
    });

    it('ignores distance when the limit is in hours', () => {
      const entry: ThresholdEntry = { value: 50, unit: 'h' };

      expect(
        resolveCurrentConsumption(entry, {
          distance: 600000,
          movingTime: 180000,
        }),
      ).toBe(50);
    });

    it('returns 0 for a zero value of the relevant quantity', () => {
      const kmEntry: ThresholdEntry = { value: 600, unit: 'km' };
      const hEntry: ThresholdEntry = { value: 50, unit: 'h' };

      expect(resolveCurrentConsumption(kmEntry, { distance: 0 })).toBe(0);
      expect(resolveCurrentConsumption(hEntry, { movingTime: 0 })).toBe(0);
    });

    it('keeps fractional values in the limit unit', () => {
      const entry: ThresholdEntry = { value: 50, unit: 'h' };

      expect(resolveCurrentConsumption(entry, { movingTime: 5400 })).toBe(1.5);
      expect(
        resolveCurrentConsumption({ value: 100, unit: 'km' }, { distance: 750 }),
      ).toBe(0.75);
    });
  });
});
