/* @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Header from '../../../src/components/Header';
import { AuthContext } from '../../../src/contexts/AuthContext';

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...props }: any) => (
    <a href={typeof href === 'string' ? href : '/'} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../../src/components/Sidebar', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid='sidebar'>{isOpen ? 'open' : 'closed'}</div>
  ),
}));

vi.mock('react-spinners', () => ({
  PulseLoader: () => <div data-testid='pulse-loader'>loading</div>,
}));

function makeAuthContext(overrides: Record<string, unknown> = {}) {
  return {
    codeReturned: null,
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

describe('Header component', () => {
  it('renders public actions when code was not returned', () => {
    const openModal = vi.fn();
    const authValue = makeAuthContext({ codeReturned: null, openModal });
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Header />
        </AuthContext.Provider>,
      );
    });

    expect(
      container.querySelector('[aria-label="Entrar com Strava"]'),
    ).toBeTruthy();
    const infoButton = container.querySelector(
      '[aria-label="Abrir informações"]',
    ) as HTMLButtonElement;
    act(() => {
      infoButton.click();
    });
    expect(openModal).toHaveBeenCalledWith('info');
    act(() => {
      root.unmount();
    });
  });

  it('renders authenticated actions and triggers signOut', () => {
    const signOut = vi.fn();
    const authValue = makeAuthContext({
      codeReturned: 'code',
      athlete: { id: 1 },
      signOut,
    });
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Header />
        </AuthContext.Provider>,
      );
    });

    const menuButton = container.querySelector(
      '[aria-label="Abrir menu lateral"]',
    ) as HTMLButtonElement;
    act(() => {
      menuButton.click();
    });
    const sidebar = container.querySelector('[data-testid="sidebar"]');
    expect(sidebar?.textContent).toContain('open');

    const logoutButton = container.querySelector(
      '[aria-label="Sair da conta"]',
    ) as HTMLButtonElement;
    act(() => {
      logoutButton.click();
    });
    expect(signOut).toHaveBeenCalledTimes(1);
    act(() => {
      root.unmount();
    });
  });

  it('renders loader when authenticated but athlete is still missing', () => {
    const authValue = makeAuthContext({
      codeReturned: 'code',
      athlete: null,
    });
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Header />
        </AuthContext.Provider>,
      );
    });

    expect(container.querySelector('[data-testid="pulse-loader"]')).toBeTruthy();
    act(() => {
      root.unmount();
    });
  });
});
