/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../../../src/lib/registerServiceWorker';

function stubServiceWorker(register: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { register },
    configurable: true,
    writable: true,
  });
}

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  // Ordem importa: sem serviceWorker no navegador a função retorna antes de
  // escutar `load`, então nenhum listener fica pendente para o teste seguinte.
  it('não registra nada quando o navegador não expõe serviceWorker', () => {
    vi.stubEnv('NODE_ENV', 'production');
    Reflect.deleteProperty(navigator, 'serviceWorker');

    registerServiceWorker();
    window.dispatchEvent(new Event('load'));

    expect('serviceWorker' in navigator).toBe(false);
  });

  it('registra /sw.js quando o app roda em produção', () => {
    const register = vi.fn().mockResolvedValue(undefined);
    stubServiceWorker(register);
    vi.stubEnv('NODE_ENV', 'production');

    registerServiceWorker();
    window.dispatchEvent(new Event('load'));

    expect(register).toHaveBeenCalledWith('/sw.js');
  });
});
