/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import AthleteStats from '../../../src/components/AthleteStats';
import { AuthContext } from '../../../src/contexts/AuthContext';

function ctx(overrides: Record<string, unknown> = {}) {
  return {
    codeReturned: 'code',
    oauth_state: 'state',
    athlete: { id: 1 },
    athleteStats: {
      biggest_ride_distance: 50000,
      biggest_climb_elevation_gain: 1200,
      recent_ride_totals: { count: 1, distance: 1000, moving_time: 100, elevation_gain: 20 },
      ytd_ride_totals: { count: 2, distance: 2000, moving_time: 200, elevation_gain: 40 },
      all_ride_totals: { count: 3, distance: 3000, moving_time: 300, elevation_gain: 60 },
      recent_run_totals: { count: 1, distance: 500, moving_time: 50, elevation_gain: 5 },
      ytd_run_totals: { count: 2, distance: 700, moving_time: 70, elevation_gain: 7 },
      all_run_totals: { count: 3, distance: 900, moving_time: 90, elevation_gain: 9 },
    },
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

describe('AthleteStats component', () => {
  it('renders stats sections and closes modal', () => {
    const closeModal = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(
        <AuthContext.Provider value={ctx({ closeModal })}>
          <AthleteStats />
        </AuthContext.Provider>,
      );
    });

    expect(container.textContent).toContain('Estatísticas:');
    expect(container.textContent).toContain('Maior distância');
    expect(container.textContent).toContain('Últimas 4 semanas');
    expect(container.textContent).toContain('0,90km');

    const closeIcon = container.querySelector(
      '[style*="cursor: pointer"]',
    ) as HTMLElement;
    act(() => closeIcon.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(closeModal).toHaveBeenCalled();

    act(() => root.unmount());
  });
});
