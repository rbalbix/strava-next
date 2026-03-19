/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import Toast from '../../../src/components/Toast';
import { ToastProvider, useToast } from '../../../src/contexts/ToastContext';

function Trigger({ variant }: { variant?: 'info' | 'success' | 'error' }) {
  const { showToast } = useToast();
  return (
    <button
      type='button'
      onClick={() => showToast('hello', variant, 500)}
    >
      trigger
    </button>
  );
}

function mount(el: React.ReactElement) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(el));
  return { container, root };
}

describe('Toast', () => {
  it('shows and auto-hides toast', () => {
    vi.useFakeTimers();
    const { container, root } = mount(
      <ToastProvider>
        <Trigger />
        <Toast />
      </ToastProvider>,
    );

    const button = container.querySelector('button') as HTMLButtonElement;
    act(() => button.click());
    expect(container.textContent).toContain('hello');

    act(() => {
      vi.runAllTimers();
    });
    expect(container.textContent).not.toContain('hello');
    act(() => root.unmount());
    vi.useRealTimers();
  });

  it('renders error toasts as alerts', () => {
    const { container, root } = mount(
      <ToastProvider>
        <Trigger variant='error' />
        <Toast />
      </ToastProvider>,
    );

    const button = container.querySelector('button') as HTMLButtonElement;
    act(() => button.click());
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    act(() => root.unmount());
  });

  it('throws when used outside provider', () => {
    function Bad() {
      useToast();
      return <div>bad</div>;
    }

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => mount(<Bad />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
