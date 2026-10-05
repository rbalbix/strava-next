/* @vitest-environment jsdom */
import React, { useContext } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../src/lib/apiClient';
import { AuthContext, AuthProvider } from '../../../src/contexts/AuthContext';

const replace = vi.fn();
vi.mock('next/router', () => ({
  useRouter: () => ({ replace }),
}));

vi.mock('../../../src/services/logger', () => ({
  getLogger: () => ({ warn: vi.fn() }),
}));

function Consumer() {
  const ctx = useContext(AuthContext);
  return (
    <div>
      <span data-testid='code'>{ctx.codeReturned ?? 'null'}</span>
      <span data-testid='athlete-id'>{ctx.athlete?.id ?? 'nenhum'}</span>
      <span data-testid='stats-state'>
        {ctx.athleteStats ? 'preenchido' : 'vazio'}
      </span>
      <span data-testid='error-state'>
        {ctx.codeError ? String(ctx.codeError) : 'sem erro'}
      </span>
      <button onClick={() => ctx.openModal('info')}>open</button>
      <button onClick={() => ctx.closeModal()}>close</button>
      <button onClick={() => ctx.setAthleteInfo({ id: 1 } as any)}>set-athlete</button>
      <button onClick={() => ctx.signOut()}>logout</button>
      <button onClick={() => ctx.setAthleteInfoStats({} as any)}>set-stats</button>
      <button onClick={() => ctx.setErrorInfo('erro-de-codigo')}>set-error</button>
      <span data-testid='active-modal'>{ctx.activeModal ?? 'none'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  it('manages modal and signOut flow', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AuthProvider
          codeReturned='code'
          oauth_state='state'
          athlete_id={1}
        >
          <Consumer />
        </AuthProvider>,
      );
    });

    const buttons = container.querySelectorAll('button');
    await act(async () => {
      (buttons[0] as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="active-modal"]')?.textContent).toBe(
      'info',
    );

    await act(async () => {
      (buttons[1] as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="active-modal"]')?.textContent).toBe(
      'none',
    );

    sessionStorage.setItem('athlete', '{}');
    await act(async () => {
      await (buttons[3] as HTMLButtonElement).click();
    });

    expect(replace).toHaveBeenCalledWith('/');
    expect(container.querySelector('[data-testid="code"]')?.textContent).toBe('null');
    act(() => root.unmount());
  });

  it('atualiza atleta, estatísticas e erro pelo contexto', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AuthProvider
          codeReturned='code'
          oauth_state='state'
          athlete_id={1}
        >
          <Consumer />
        </AuthProvider>,
      );
    });

    const buttons = container.querySelectorAll('button');
    await act(async () => {
      (buttons[2] as HTMLButtonElement).click();
    });
    expect(
      container.querySelector('[data-testid="athlete-id"]')?.textContent,
    ).toBe('1');

    await act(async () => {
      (buttons[4] as HTMLButtonElement).click();
    });
    expect(
      container.querySelector('[data-testid="stats-state"]')?.textContent,
    ).toBe('preenchido');

    await act(async () => {
      (buttons[5] as HTMLButtonElement).click();
    });
    expect(
      container.querySelector('[data-testid="error-state"]')?.textContent,
    ).toBe('erro-de-codigo');

    act(() => root.unmount());
  });

  it('conclui o logout e registra aviso quando a API do servidor falha', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(apiClient, 'logout').mockRejectedValueOnce(
      new Error('offline'),
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AuthProvider
          codeReturned='code'
          oauth_state='state'
          athlete_id={1}
        >
          <Consumer />
        </AuthProvider>,
      );
    });

    const buttons = container.querySelectorAll('button');
    await act(async () => {
      await (buttons[3] as HTMLButtonElement).click();
    });

    expect(warn).toHaveBeenCalledWith(
      'Server logout failed',
      expect.any(Error),
    );
    expect(replace).toHaveBeenCalledWith('/');
    expect(
      container.querySelector('[data-testid="code"]')?.textContent,
    ).toBe('null');

    warn.mockRestore();
    act(() => root.unmount());
  });
});
