/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import Home, { getServerSideProps } from '../../../src/pages/index';

vi.mock('next/dynamic', () => ({
  default: () => () => <div>dynamic</div>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => (
    <a href={typeof href === 'string' ? href : '/'}>{children}</a>
  ),
}));

vi.mock('next/router', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('../../../src/components/SeoHead', () => ({ default: () => null }));
vi.mock('../../../src/components/Header', () => ({ default: () => <header>header</header> }));
vi.mock('../../../src/components/Footer', () => ({ default: () => <footer>footer</footer> }));
vi.mock('../../../src/components/ErroMsg', () => ({ default: () => <div>erro</div> }));
vi.mock('../../../src/components/ChainIcon', () => ({ default: () => <span>chain</span> }));
vi.mock('../../../src/components/ModalContainer', () => ({ default: () => <div>modal</div> }));

describe('home page', () => {
  it('renders the landing when there is no session', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(
        <Home
          code={null}
          oauth_state='state'
          athlete_id={null}
        />,
      );
    });
    expect(container.textContent).toContain('Pedale. A gente cuida da manutenção.');
    expect(container.textContent).toContain('Entrar com Strava');
    expect(container.textContent).toContain('Como funciona');
    act(() => root.unmount());
  });

  it('landing offers the login CTA and opens the info modal', () => {
    // A landing foi simplificada pelo proprietário (§8.11): o título de marca
    // como <h1> e a navegação pública embutida saíram do layout. O que precisa
    // permanecer é o caminho de entrada (link de login) e o "Como funciona",
    // que agora abre o modal informativo em vez de navegar.
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(
        <Home code={null} oauth_state='state' athlete_id={null} />,
      );
    });

    expect(container.textContent).toContain(
      'Pedale. A gente cuida da manutenção.',
    );

    const hrefs = Array.from(container.querySelectorAll('a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toContain('/api/oauth/start');

    const comoFunciona = Array.from(
      container.querySelectorAll('button'),
    ).find((b) => b.textContent?.includes('Como funciona'));
    expect(comoFunciona).toBeTruthy();

    act(() => root.unmount());
  });

  it('getServerSideProps renders the landing without redirecting', async () => {
    const setHeader = vi.fn();
    const result = await getServerSideProps({
      req: {
        headers: { cookie: '' },
      },
      res: { setHeader },
    } as any);

    // Antes, a ausência de cookies redirecionava para /api/oauth/start e dali
    // para o Strava — o visitante nunca via o produto.
    expect((result as any).redirect).toBeUndefined();
    expect((result as any).props.code).toBeNull();
    expect((result as any).props.athlete_id).toBeNull();
    // Mesmo sem sessão a página não pode ser cacheada: a mesma URL serve o
    // painel de quem tem cookie, e uma landing em cache voltaria a ser servida
    // para o usuário recém-logado.
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  // A sessão é validada na chamada de dados, não aqui. Consultar o Redis
  // neste ponto custaria 20–80 ms de first-paint em toda visita autenticada
  // para resolver um caso raro — e faria este teste (e o E2E) depender de um
  // Redis real só para renderizar o painel. O 401 de /api/app/dashboard é o
  // que encerra a sessão; ver §8.6.
  it('getServerSideProps reads cookies and sets no-store cache when authenticated', async () => {
    const setHeader = vi.fn();
    const result = await getServerSideProps({
      req: {
        headers: { cookie: 'strava_code=abc; strava_athleteId=123' },
      },
      res: { setHeader },
    } as any);

    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect((result as any).props.code).toBe('abc');
    expect((result as any).props.athlete_id).toBe(123);
    // Sem round-trip de I/O: só cookies são lidos.
    expect(setHeader).toHaveBeenCalledTimes(1);
  });

  it('getServerSideProps treats a partial session as unauthenticated', async () => {
    const setHeader = vi.fn();
    const result = await getServerSideProps({
      req: {
        // athleteId sem code: sessão incompleta, não pode renderizar o painel.
        headers: { cookie: 'strava_athleteId=123' },
      },
      res: { setHeader },
    } as any);

    expect((result as any).props.code).toBeNull();
    expect((result as any).props.athlete_id).toBeNull();
  });
});
