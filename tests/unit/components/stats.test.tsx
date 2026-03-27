/* @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Stats from '../../../src/components/Stats';
import { AuthContext } from '../../../src/contexts/AuthContext';

vi.mock('../../../src/components/Card', () => ({
  default: ({ name }: { name: string }) => <div>Card: {name}</div>,
}));

vi.mock('../../../src/components/DiskIcon', () => ({
  default: () => <span>disk</span>,
}));
vi.mock('../../../src/components/TireIcon', () => ({
  default: () => <span>tire</span>,
}));
vi.mock('../../../src/components/VeloIcon', () => ({
  default: () => <span>velo</span>,
}));

function makeAuthContext(overrides: Record<string, unknown> = {}) {
  return {
    codeReturned: 'code',
    oauth_state: 'state',
    athlete: null,
    athleteStats: null,
    codeError: null,
    activeModal: null,
    modalData: null,
    setAthleteInfo: vi.fn(),
    setAthleteInfoStats: vi.fn(),
    setErrorInfo: vi.fn(),
    signOut: vi.fn(),
    openModal: vi.fn(),
    closeModal: vi.fn(),
    ...overrides,
  } as any;
}

describe('Stats component', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows empty-state when athlete has no gear', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          athlete: { id: 1 },
          athleteStats: {},
          hasGear: false,
          hasActivities: true,
          gearStats: [],
        }),
      }),
    );

    const authValue = makeAuthContext();
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Nenhum equipamento cadastrado no Strava');
    act(() => {
      root.unmount();
    });
  });

  it('shows empty-state when athlete has no activities', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          athlete: { id: 1 },
          athleteStats: {},
          hasGear: true,
          hasActivities: false,
          gearStats: [],
        }),
      }),
    );

    const authValue = makeAuthContext();
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Nenhuma atividade criada no Strava');
    act(() => {
      root.unmount();
    });
  });

  it('renders cards when dashboard returns gear stats', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          athlete: { id: 1 },
          athleteStats: {},
          hasGear: true,
          hasActivities: true,
          gearStats: [
            {
              id: 'bike-1',
              name: 'Bike One',
              activityType: 'Ride',
              count: 1,
              distance: 1000,
              movingTime: 100,
              equipments: [],
            },
          ],
        }),
      }),
    );

    const authValue = makeAuthContext();
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Card: Bike One');
    act(() => {
      root.unmount();
    });
  });

  it('signs out when dashboard returns non-ok response and there is no cache', async () => {
    const signOut = vi.fn();
    const setErrorInfo = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const authValue = makeAuthContext({ signOut, setErrorInfo });
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(setErrorInfo).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
    act(() => {
      root.unmount();
    });
  });

  it('skips network request when fresh cache exists', async () => {
    sessionStorage.setItem('athlete', JSON.stringify({ id: 2 }));
    sessionStorage.setItem('athleteStats', JSON.stringify({}));
    sessionStorage.setItem('gearStats', JSON.stringify([]));
    sessionStorage.setItem('hasGear', 'true');
    sessionStorage.setItem('hasActivities', 'true');
    sessionStorage.setItem('athleteCacheTime', Date.now().toString());

    const signOut = vi.fn();
    const setErrorInfo = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    const authValue = makeAuthContext({ signOut, setErrorInfo });
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect((globalThis.fetch as any)).not.toHaveBeenCalled();
    expect(setErrorInfo).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Aguarde.');
    act(() => {
      root.unmount();
    });
  });

  it('signs out when dashboard request fails and there is no cache', async () => {
    const signOut = vi.fn();
    const setErrorInfo = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    const authValue = makeAuthContext({ signOut, setErrorInfo });
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(setErrorInfo).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
    act(() => {
      root.unmount();
    });
  });

  it('ignores malformed cached json and still uses network response', async () => {
    sessionStorage.setItem('athlete', '{invalid-json');
    sessionStorage.setItem('athleteStats', JSON.stringify({}));
    sessionStorage.setItem('gearStats', JSON.stringify([]));
    sessionStorage.setItem('athleteCacheTime', Date.now().toString());

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          athlete: { id: 1 },
          athleteStats: {},
          hasGear: true,
          hasActivities: true,
          gearStats: [
            {
              id: 'bike-2',
              name: 'Bike Two',
              activityType: 'Ride',
              count: 1,
              distance: 1000,
              movingTime: 100,
              equipments: [],
            },
          ],
        }),
      }),
    );

    const authValue = makeAuthContext();
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Card: Bike Two');
    act(() => root.unmount());
  });

  it('falls back to network when cache is missing required keys', async () => {
    sessionStorage.setItem('athlete', JSON.stringify({ id: 2 }));
    sessionStorage.removeItem('athleteStats');
    sessionStorage.setItem('gearStats', JSON.stringify([]));
    sessionStorage.setItem('athleteCacheTime', Date.now().toString());

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          athlete: { id: 3 },
          athleteStats: {},
          hasGear: true,
          hasActivities: true,
          gearStats: [],
        }),
      }),
    );

    const authValue = makeAuthContext();
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect((globalThis.fetch as any)).toHaveBeenCalled();
    act(() => root.unmount());
  });

  it('stores empty gearStats when API omits the field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          athlete: { id: 1 },
          athleteStats: {},
          hasGear: true,
          hasActivities: true,
          gearStats: undefined,
        }),
      }),
    );

    const authValue = makeAuthContext();
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(sessionStorage.getItem('gearStats')).toBe('[]');
    act(() => root.unmount());
  });

  it('ignores cache with invalid cache time value', async () => {
    sessionStorage.setItem('athleteCacheTime', 'NaN');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          athlete: { id: 1 },
          athleteStats: {},
          hasGear: true,
          hasActivities: true,
          gearStats: [],
        }),
      }),
    );

    const authValue = makeAuthContext();
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect((globalThis.fetch as any)).toHaveBeenCalled();
    act(() => root.unmount());
  });

  it('ignores expired cache and handles network failure as no-cache path', async () => {
    sessionStorage.setItem('athlete', JSON.stringify({ id: 2 }));
    sessionStorage.setItem('athleteStats', JSON.stringify({}));
    sessionStorage.setItem('gearStats', JSON.stringify([]));
    sessionStorage.setItem('athleteCacheTime', String(Date.now() - 10 * 60 * 1000));

    const signOut = vi.fn();
    const setErrorInfo = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    const authValue = makeAuthContext({ signOut, setErrorInfo });
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(setErrorInfo).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('treats missing hasGear/hasActivities cache keys as true defaults', async () => {
    sessionStorage.setItem('athlete', JSON.stringify({ id: 2 }));
    sessionStorage.setItem('athleteStats', JSON.stringify({}));
    sessionStorage.setItem('gearStats', JSON.stringify([]));
    sessionStorage.setItem('athleteCacheTime', Date.now().toString());
    sessionStorage.removeItem('hasGear');
    sessionStorage.removeItem('hasActivities');

    const signOut = vi.fn();
    const setErrorInfo = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    const authValue = makeAuthContext({ signOut, setErrorInfo });
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect((globalThis.fetch as any)).not.toHaveBeenCalled();
    expect(setErrorInfo).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Aguarde.');
    act(() => root.unmount());
  });
});
