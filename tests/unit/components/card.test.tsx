/* @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Card from '../../../src/components/Card';
import { AuthContext } from '../../../src/contexts/AuthContext';

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

describe('Card component', () => {
  it('renders gear summary and opens modal on click', () => {
    const openModal = vi.fn();
    const authValue = makeAuthContext({ openModal });
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Card
            id='bike-1'
            name='Bike One'
            activityType='Ride'
            count={3}
            distance={12000}
            movingTime={3600}
            equipments={[]}
          />
        </AuthContext.Provider>,
      );
    });

    expect(container.textContent).toContain('Bike One');
    expect(container.textContent).toContain('3 atividades.');
    expect(container.textContent).toContain('12,00 km');
    expect(container.textContent).toContain('01:00h');

    const clickable = container.querySelector('header') as HTMLElement;
    act(() => {
      clickable.click();
    });
    expect(openModal).toHaveBeenCalledWith(
      'card-detail',
      expect.objectContaining({ id: 'bike-1', count: 3 }),
    );
    act(() => {
      root.unmount();
    });
  });

  it('shows lubrication status for ride with lubrication equipment', () => {
    const authValue = makeAuthContext();
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Card
            id='bike-1'
            name='Bike One'
            activityType='Ride'
            count={1}
            distance={1000}
            movingTime={100}
            equipments={[
              {
                id: 'lub',
                caption: 'lub:',
                show: 'Lubrification',
                distance: 0,
                movingTime: 0,
              },
            ]}
          />
        </AuthContext.Provider>,
      );
    });

    expect(container.textContent).toContain('Bike lubrificada. 👏');
    act(() => {
      root.unmount();
    });
  });
});
