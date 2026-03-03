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
});
