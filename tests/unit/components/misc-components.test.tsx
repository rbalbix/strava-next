/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import AthleteAvatar from '../../../src/components/AthleteAvatar';
import ErroMsg from '../../../src/components/ErroMsg';
import Footer from '../../../src/components/Footer';
import PublicPageNav from '../../../src/components/PublicPageNav';
import SeoHead from '../../../src/components/SeoHead';
import StatCard from '../../../src/components/StatCard';
import { AuthContext } from '../../../src/contexts/AuthContext';
import { ToastProvider } from '../../../src/contexts/ToastContext';

vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={typeof href === 'string' ? href : '/'}>{children}</a>,
}));

vi.mock('next/head', () => ({
  default: ({ children }: any) => <>{children}</>,
}));

function ctx(overrides: Record<string, unknown> = {}) {
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

function mount(el: React.ReactElement) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(el));
  return { container, root };
}

describe('misc components', () => {
  it('AthleteAvatar renders nothing when athlete/profile is missing', () => {
    const { container, root } = mount(
      <AuthContext.Provider value={ctx()}>
        <AthleteAvatar />
      </AuthContext.Provider>,
    );
    expect(container.innerHTML).toBe('');
    act(() => root.unmount());
  });

  it('AthleteAvatar renders image and identity', () => {
    const { container, root } = mount(
      <AuthContext.Provider
        value={ctx({
          athlete: {
            firstname: 'Ana',
            lastname: 'Silva',
            city: 'SP',
            profile: 'https://example.com/p.jpg',
          },
        })}
      >
        <AthleteAvatar />
      </AuthContext.Provider>,
    );
    expect(container.textContent).toContain('Ana Silva');
    expect(container.textContent).toContain('SP');
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/p.jpg',
    );
    act(() => root.unmount());
  });

  it('AthleteAvatar uses fallback name when firstname is missing', () => {
    const { container, root } = mount(
      <AuthContext.Provider
        value={ctx({
          athlete: {
            lastname: 'Silva',
            city: '',
            profile: 'https://example.com/p.jpg',
          },
        })}
      >
        <AthleteAvatar />
      </AuthContext.Provider>,
    );
    expect(container.textContent).toContain('Usuário Desconhecido');
    act(() => root.unmount());
  });

  it('ErroMsg renders a specific message per status', () => {
    const renderError = (codeError: unknown) =>
      mount(
        <ToastProvider>
          <AuthContext.Provider value={ctx({ codeError })}>
            <ErroMsg />
          </AuthContext.Provider>
        </ToastProvider>,
      );

    const limited = renderError({ status: 429 });
    expect(limited.container.textContent).toContain('Limite excedido');
    act(() => limited.root.unmount());

    const expired = renderError({ status: 401 });
    // 401 não é um painel: o fluxo de sessão recupera automaticamente ou
    // volta para a landing, sem a mensagem confusa de "Sessão expirada".
    expect(expired.container.innerHTML).toBe('');
    act(() => expired.root.unmount());

    const failed = renderError({ status: 500 });
    expect(failed.container.textContent).toContain(
      'Não conseguimos atualizar seus dados',
    );
    act(() => failed.root.unmount());
  });

  it('ErroMsg renders nothing without an error and retries on demand', () => {
    const none = mount(
      <ToastProvider>
        <AuthContext.Provider value={ctx({ codeError: null })}>
          <ErroMsg />
        </AuthContext.Provider>
      </ToastProvider>,
    );
    expect(none.container.innerHTML).toBe('');
    act(() => none.root.unmount());

    const onRetry = vi.fn();
    const withRetry = mount(
      <ToastProvider>
        <AuthContext.Provider value={ctx({ codeError: null })}>
          <ErroMsg
            error={new Error('Request failed: HTTP 503')}
            onRetry={onRetry}
          />
        </AuthContext.Provider>
      </ToastProvider>,
    );
    expect(withRetry.container.textContent).toContain('Tentar novamente');
    act(() =>
      (withRetry.container.querySelector('button') as HTMLButtonElement).click(),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
    act(() => withRetry.root.unmount());
  });

  it('ErroMsg falls back to the generic message when there is no status', () => {
    const c = mount(
      <ToastProvider>
        <AuthContext.Provider value={ctx({ codeError: '429' })}>
          <ErroMsg />
        </AuthContext.Provider>
      </ToastProvider>,
    );
    expect(c.container.textContent).toContain(
      'Não conseguimos atualizar seus dados',
    );
    act(() => c.root.unmount());
  });

  it('Footer shows equipment button when athlete exists', () => {
    const openModal = vi.fn();
    const { container, root } = mount(
      <AuthContext.Provider value={ctx({ athlete: { id: 1 }, openModal })}>
        <Footer />
      </AuthContext.Provider>,
    );
    const button = container.querySelector(
      '[aria-label="Abrir componentes"]',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    act(() => button.click());
    expect(openModal).toHaveBeenCalledWith('equipments');
    act(() => root.unmount());
  });

  it('PublicPageNav renders expected links', () => {
    const { container, root } = mount(<PublicPageNav />);
    expect(container.textContent).toContain('Início');
    expect(container.textContent).toContain('Como funciona');
    expect(container.querySelectorAll('a').length).toBe(5);
    act(() => root.unmount());
  });

  it('SeoHead renders canonical and open graph tags', () => {
    const { container, root } = mount(
      <SeoHead title='T' description='D' path='/faq' />,
    );
    expect(container.querySelector('title')?.textContent).toBe('T');
    expect(
      container.querySelector('meta[name="description"]')?.getAttribute('content'),
    ).toBe('D');
    expect(
      container.querySelector('meta[name="viewport"]')?.getAttribute('content'),
    ).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
    expect(
      container.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toContain('/faq');
    expect(
      container.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    ).toBe('T');
    expect(
      container
        .querySelector('meta[property="og:description"]')
        ?.getAttribute('content'),
    ).toBe('D');
    expect(
      container.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    ).toContain('/images/tela-inicio-1.jpeg');
    expect(
      container
        .querySelector('meta[property="og:image:alt"]')
        ?.getAttribute('content'),
    ).toBe('Prévia do GearLife');
    expect(
      container.querySelector('meta[name="twitter:card"]')?.getAttribute('content'),
    ).toBe('summary_large_image');
    expect(
      container
        .querySelector('meta[name="twitter:title"]')
        ?.getAttribute('content'),
    ).toBe('T');
    expect(
      container
        .querySelector('meta[name="twitter:description"]')
        ?.getAttribute('content'),
    ).toBe('D');
    act(() => root.unmount());
  });

  it('SeoHead normalizes path without leading slash', () => {
    const { container, root } = mount(<SeoHead title='T2' description='D2' path='about' />);
    expect(
      container.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toContain('/about');
    act(() => root.unmount());
  });

  it('StatCard renders value, label and icon', () => {
    const { container, root } = mount(
      <StatCard value='10km' label='Distance' icon='📍' />,
    );
    expect(container.textContent).toContain('10km');
    expect(container.textContent).toContain('Distance');
    expect(container.textContent).toContain('📍');
    act(() => root.unmount());
  });
});
