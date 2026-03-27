/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ModalContainer from '../../../src/components/ModalContainer';
import { AuthContext } from '../../../src/contexts/AuthContext';

vi.mock('../../../src/components/AthleteStats', () => ({ default: () => <div>athlete-stats</div> }));
vi.mock('../../../src/components/ComponentInfo', () => ({ default: () => <div>component-info</div> }));
vi.mock('../../../src/components/InitialInfoModal', () => ({ default: () => <div>info-modal</div> }));
vi.mock('../../../src/components/CardDetailModal', () => ({ default: () => <div>card-detail</div> }));

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

function mount(el: React.ReactElement) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(el));
  document.body.appendChild(container);
  const originalUnmount = root.unmount.bind(root);
  (root as unknown as { unmount: () => void }).unmount = () => {
    originalUnmount();
    container.remove();
  };
  return { container, root };
}

describe('ModalContainer', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when activeModal is null', () => {
    const { container, root } = mount(
      <AuthContext.Provider value={ctx({ activeModal: null })}>
        <ModalContainer />
      </AuthContext.Provider>,
    );
    expect(container.innerHTML).toBe('');
    act(() => root.unmount());
  });

  it('renders selected modal content and closes on overlay click', () => {
    const closeModal = vi.fn();
    const { container, root } = mount(
      <AuthContext.Provider value={ctx({ activeModal: 'info', closeModal })}>
        <ModalContainer />
      </AuthContext.Provider>,
    );

    expect(container.textContent).toContain('info-modal');
    const overlay = container.firstElementChild as HTMLElement;
    act(() => overlay.click());
    expect(closeModal).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('renders each known modal mapping', () => {
    const stats = mount(
      <AuthContext.Provider value={ctx({ activeModal: 'stats' })}>
        <ModalContainer />
      </AuthContext.Provider>,
    );
    expect(stats.container.textContent).toContain('athlete-stats');
    act(() => stats.root.unmount());

    const equipments = mount(
      <AuthContext.Provider value={ctx({ activeModal: 'equipments' })}>
        <ModalContainer />
      </AuthContext.Provider>,
    );
    expect(equipments.container.textContent).toContain('component-info');
    act(() => equipments.root.unmount());

    const detail = mount(
      <AuthContext.Provider value={ctx({ activeModal: 'card-detail', modalData: { id: 'x' } })}>
        <ModalContainer />
      </AuthContext.Provider>,
    );
    expect(detail.container.textContent).toContain('card-detail');
    act(() => detail.root.unmount());
  });

  it('closes modal on Escape key when active', () => {
    const closeModal = vi.fn();
    const { root } = mount(
      <AuthContext.Provider value={ctx({ activeModal: 'info', closeModal })}>
        <ModalContainer />
      </AuthContext.Provider>,
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(closeModal).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('focuses first focusable element and traps focus with Tab', () => {
    const { container, root } = mount(
      <AuthContext.Provider value={ctx({ activeModal: 'info' })}>
        <ModalContainer />
      </AuthContext.Provider>,
    );

    const modal = container.querySelector('[role="dialog"]') as HTMLElement;
    const buttonA = document.createElement('button');
    buttonA.textContent = 'first';
    const buttonB = document.createElement('button');
    buttonB.textContent = 'last';
    modal.appendChild(buttonA);
    modal.appendChild(buttonB);

    act(() => {
      vi.runAllTimers();
    });
    expect(document.activeElement).toBe(buttonA);

    buttonB.focus();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    });
    expect(document.activeElement).toBe(buttonA);

    buttonA.focus();
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }),
      );
    });
    expect(document.activeElement).toBe(buttonB);

    act(() => root.unmount());
  });

  it('focuses dialog when there are no focusable elements', () => {
    const { container, root } = mount(
      <AuthContext.Provider value={ctx({ activeModal: 'info' })}>
        <ModalContainer />
      </AuthContext.Provider>,
    );

    const modal = container.querySelector('[role="dialog"]') as HTMLElement;

    act(() => {
      vi.runAllTimers();
    });

    expect(document.activeElement).toBe(modal);
    act(() => root.unmount());
  });

  it('prevents Tab when no focusable elements exist', () => {
    const { root } = mount(
      <AuthContext.Provider value={ctx({ activeModal: 'info' })}>
        <ModalContainer />
      </AuthContext.Provider>,
    );

    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    Object.defineProperty(event, 'preventDefault', {
      value: vi.fn(),
      writable: true,
    });
    act(() => {
      document.dispatchEvent(event);
    });
    expect((event as unknown as { preventDefault: ReturnType<typeof vi.fn> }).preventDefault).toHaveBeenCalled();

    act(() => root.unmount());
  });

  it('returns null for unknown modal type', () => {
    const { container, root } = mount(
      <AuthContext.Provider value={ctx({ activeModal: 'unknown' })}>
        <ModalContainer />
      </AuthContext.Provider>,
    );
    expect(container.innerHTML).toBe('');
    act(() => root.unmount());
  });

  it('restores focus when activeModal changes to null', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);

    act(() => {
      root.render(
        <AuthContext.Provider value={ctx({ activeModal: 'info' })}>
          <ModalContainer />
        </AuthContext.Provider>,
      );
    });

    act(() => {
      root.render(
        <AuthContext.Provider value={ctx({ activeModal: null })}>
          <ModalContainer />
        </AuthContext.Provider>,
      );
    });

    expect(document.activeElement).toBe(trigger);

    act(() => root.unmount());
    container.remove();
    trigger.remove();
  });

  it('restores focus to the previously active element after close', () => {
    const closeModal = vi.fn();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const { root } = mount(
      <AuthContext.Provider value={ctx({ activeModal: 'info', closeModal })}>
        <ModalContainer />
      </AuthContext.Provider>,
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(closeModal).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});
