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
});
