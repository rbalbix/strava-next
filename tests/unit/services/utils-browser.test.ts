/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { copyEventDetailsToClipboard, copyTextToClipboard } from '../../../src/services/utils';

describe('utils browser helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('copyTextToClipboard uses navigator.clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    copyTextToClipboard('hello');
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('copyTextToClipboard falls back to execCommand when clipboard is unavailable', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    const exec = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      value: exec,
      configurable: true,
    });

    copyTextToClipboard('fallback');
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('copyEventDetailsToClipboard formats and copies event details', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    copyEventDetailsToClipboard(
      { id: 'chain', caption: 'corrente', show: 'Corrente', distance: 1000, movingTime: 100 },
      5000,
      600,
    );
    await Promise.resolve();
    expect(writeText).toHaveBeenCalled();
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('km');
    expect(text).toContain('[');
  });

  it('copyEventDetailsToClipboard handles missing equipment distance', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    copyEventDetailsToClipboard(
      { id: 'chain', caption: 'corrente', show: 'Corrente' },
      5000,
      600,
    );
    await Promise.resolve();
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('[0,00 km]');
  });
});
