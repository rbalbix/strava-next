import { describe, expect, it } from 'vitest';
import {
  STRAVA_RATE_LIMIT_WINDOW_MS,
  secondsToNextStravaWindow,
} from '../../../src/services/rate-limit';

// Janelas do Strava: reset às :00, :15, :30 e :45 (epoch 0 = 1970-01-01
// 00:00:00 UTC, já alinhado ao quarto de hora).
const MINUTE = 60 * 1000;

describe('secondsToNextStravaWindow', () => {
  it('exposes the 15-minute Strava window', () => {
    expect(STRAVA_RATE_LIMIT_WINDOW_MS).toBe(15 * MINUTE);
  });

  it('counts down to the next quarter-hour boundary', () => {
    const fifteenPast = 15 * MINUTE;
    expect(secondsToNextStravaWindow(fifteenPast)).toBe(900);
    // 8 min dentro da janela → 7 min até o reset.
    expect(secondsToNextStravaWindow(fifteenPast + 8 * MINUTE)).toBe(420);
    // 14 min59s dentro da janela → quase no fim.
    expect(secondsToNextStravaWindow(fifteenPast + 14 * MINUTE + 59_000)).toBe(1);
  });

  it('never returns zero, even exactly on the boundary or 1ms before it', () => {
    // Exato na virada: a janela atual só começou → conta a próxima inteira.
    expect(secondsToNextStravaWindow(STRAVA_RATE_LIMIT_WINDOW_MS)).toBe(900);
    // 1ms antes da virada → 1s (arredondamento mínimo).
    expect(
      secondsToNextStravaWindow(STRAVA_RATE_LIMIT_WINDOW_MS - 1),
    ).toBe(1);
  });

  it('defaults to the current clock', () => {
    const value = secondsToNextStravaWindow();
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(900);
  });
});
