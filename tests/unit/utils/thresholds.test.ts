import { describe, expect, it } from 'vitest';
import { computeThresholdState } from '../../../src/utils/thresholds';

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
});
