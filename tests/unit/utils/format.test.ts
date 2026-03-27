import { describe, expect, it } from 'vitest';
import { locale, secondsToHms } from '../../../src/utils/format';

describe('format utils', () => {
  it('formats seconds to HH:MM', () => {
    expect(secondsToHms(0)).toBe('00:00');
    expect(secondsToHms(3660)).toBe('01:01');
  });

  it('formats distance using pt-BR locale', () => {
    const formatted = locale.format(',.2f')(12345.67);
    expect(formatted).toBe('12.345,67');
  });
});
