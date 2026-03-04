/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from '../../../src/components/Sidebar';
import { AuthContext } from '../../../src/contexts/AuthContext';

vi.mock('next/link', () => ({
  default: ({ href, children, passHref: _passHref, ...props }: any) => (
    <a href={typeof href === 'string' ? href : '/'} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../../src/components/AthleteAvatar', () => ({
  default: () => <div>avatar</div>,
}));

function ctx(overrides: Record<string, unknown> = {}) {
  return {
    codeReturned: 'code',
    oauth_state: 'state',
    athlete: { id: 1 },
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

describe('Sidebar component', () => {
  it('opens modal actions and closes sidebar', () => {
    const openModal = vi.fn();
    const active = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <AuthContext.Provider value={ctx({ openModal })}>
          <Sidebar active={active} isOpen={true} />
        </AuthContext.Provider>,
      );
    });

    const stats = Array.from(container.querySelectorAll('span')).find((n) =>
      n.textContent?.includes('Estatísticas'),
    ) as HTMLSpanElement;
    act(() => stats.click());
    expect(openModal).toHaveBeenCalledWith('stats');
    expect(active).toHaveBeenCalledWith(false);

    const help = Array.from(container.querySelectorAll('span')).find((n) =>
      n.textContent?.includes('Ajuda'),
    ) as HTMLSpanElement;
    act(() => help.click());
    expect(openModal).toHaveBeenCalledWith('info');

    act(() => root.unmount());
  });

  it('closes on Escape when open and ignores Escape when closed', () => {
    const active = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <AuthContext.Provider value={ctx()}>
          <Sidebar active={active} isOpen={true} />
        </AuthContext.Provider>,
      );
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(active).toHaveBeenCalledWith(false);

    act(() => {
      root.render(
        <AuthContext.Provider value={ctx()}>
          <Sidebar active={active} isOpen={false} />
        </AuthContext.Provider>,
      );
    });

    const callsAfterClose = active.mock.calls.length;
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(active.mock.calls.length).toBe(callsAfterClose);

    act(() => root.unmount());
  });

  it('only closes on overlay when target equals currentTarget', () => {
    const active = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <AuthContext.Provider value={ctx()}>
          <Sidebar active={active} isOpen={true} />
        </AuthContext.Provider>,
      );
    });

    const overlay = container.querySelector('[aria-hidden="true"]') as HTMLDivElement;
    act(() => {
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(active).toHaveBeenCalledWith(false);

    const countAfterOverlay = active.mock.calls.length;
    const fakeEvent = {
      target: document.createElement('div'),
      currentTarget: overlay,
    } as unknown as React.MouseEvent<HTMLDivElement>;
    const onClick = (overlay as any).onclick as ((e: React.MouseEvent<HTMLDivElement>) => void) | null;
    expect(onClick).toBeTruthy();
    act(() => {
      onClick?.(fakeEvent);
    });
    expect(active.mock.calls.length).toBe(countAfterOverlay);

    act(() => root.unmount());
  });
});
