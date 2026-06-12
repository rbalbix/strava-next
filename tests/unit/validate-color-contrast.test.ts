import { describe, it, expect } from 'vitest';
import { parseCSSVariables, colorToHex, resolveColor } from '../../scripts/validate-color-contrast.mjs';

describe('validate-color-contrast script', () => {
  describe('parseCSSVariables', () => {
    it('should parse light theme variables correctly', () => {
      const css = `
:root {
  --gl-bg: #ffffff;
  --gl-text: #000000;
}
@media (prefers-color-scheme: dark) {
  :root {
    --gl-bg: #000000;
  }
}
      `;
      const vars = parseCSSVariables(css, false) as Record<string, string>;
      expect(vars['--gl-bg']).toBe('#ffffff');
      expect(vars['--gl-text']).toBe('#000000');
    });

    it('should parse dark theme variables correctly', () => {
      const css = `
:root {
  --gl-bg: #ffffff;
}
@media (prefers-color-scheme: dark) {
  :root {
    --gl-bg: #121212;
    --gl-text: #f0f0f0;
  }
}
      `;
      const vars = parseCSSVariables(css, true) as Record<string, string>;
      expect(vars['--gl-bg']).toBe('#121212');
      expect(vars['--gl-text']).toBe('#f0f0f0');
    });
  });

  describe('colorToHex', () => {
    it('should convert rgb to hex', () => {
      expect(colorToHex('rgb(255, 255, 255)')).toBe('#ffffff');
      expect(colorToHex('rgb(0, 0, 0)')).toBe('#000000');
    });

    it('should return hex as is', () => {
      expect(colorToHex('#fc5200')).toBe('#fc5200');
    });

    it('should handle basic color names', () => {
      expect(colorToHex('white')).toBe('#ffffff');
      expect(colorToHex('black')).toBe('#000000');
    });
  });

  describe('resolveColor', () => {
    it('should resolve simple variable', () => {
      const themeVars = { '--bg': '#fff' };
      expect(resolveColor('--bg', themeVars, {})).toBe('#fff');
    });

    it('should resolve variable reference', () => {
      const themeVars = { '--primary': 'var(--blue)', '--blue': '#007aff' };
      expect(resolveColor('--primary', themeVars, {})).toBe('#007aff');
    });

    it('should fallback to allVars', () => {
      const themeVars = { '--bg': 'var(--global-bg)' };
      const allVars = { '--global-bg': '#eee' };
      expect(resolveColor('--bg', themeVars, allVars)).toBe('#eee');
    });
  });
});
