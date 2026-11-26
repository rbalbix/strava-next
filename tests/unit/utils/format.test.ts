import { describe, expect, it } from 'vitest';
import { formatNumber, secondsToHms } from '../../../src/utils/format';

describe('format utils', () => {
  it('formats seconds to HH:MM', () => {
    expect(secondsToHms(0)).toBe('00:00');
    expect(secondsToHms(3660)).toBe('01:01');
  });

  it('formats distance using pt-BR locale', () => {
    expect(formatNumber(12345.67)).toBe('12.345,67');
  });

  it('formats with an explicit number of fraction digits', () => {
    // caminho do ",.1f" antigo (horas nos thresholds)
    expect(formatNumber(12.34, 1)).toBe('12,3');
    expect(formatNumber(1234, 0)).toBe('1.234');
  });
});
