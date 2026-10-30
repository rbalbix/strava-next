/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import ContatoPage from '../../../src/pages/contato';
import FaqPage from '../../../src/pages/faq';
import ComoFuncionaPage from '../../../src/pages/como-funciona';
import PrivacidadePage from '../../../src/pages/privacidade';
import NotFoundPage from '../../../src/pages/404';

vi.mock('../../../src/components/SeoHead', () => ({
  default: () => null,
}));
vi.mock('../../../src/components/PublicPageNav', () => ({
  default: () => <nav>nav</nav>,
}));

function renderIntoContainer(element: React.ReactElement) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, root };
}

describe('public pages', () => {
  it('renders contato page', () => {
    const { container, root } = renderIntoContainer(<ContatoPage />);
    expect(container.textContent).toContain('Contato');
    expect(container.textContent).toContain('E-mail:');
    act(() => root.unmount());
  });

  it('renders faq page', () => {
    const { container, root } = renderIntoContainer(<FaqPage />);
    expect(container.textContent).toContain('Perguntas frequentes');
    expect(container.textContent).toContain('Como desconecto minha conta?');
    // O FAQ prometia "Você pode sair da sessão no app", mas o app não tem
    // logout — a promessa foi removida e substituída pelo fluxo real.
    expect(container.textContent).not.toContain('Você pode sair da sessão');
    expect(container.textContent).toContain('aplicações conectadas do Strava');
    act(() => root.unmount());
  });

  it('renders como-funciona page', () => {
    const { container, root } = renderIntoContainer(<ComoFuncionaPage />);
    expect(container.textContent).toContain('Como funciona o GearLife');
    expect(container.textContent).toContain(
      'O GearLife conecta sua conta Strava',
    );
    expect(container.textContent).toContain('Passo 1: Acesso Inicial e Login');
    expect(container.querySelector('nav')?.textContent).toBe('nav');
    act(() => root.unmount());
  });

  it('renders privacidade page', () => {
    const { container, root } = renderIntoContainer(<PrivacidadePage />);
    expect(container.textContent).toContain('Privacidade');
    expect(container.textContent).toContain('Dados coletados');
    act(() => root.unmount());
  });

  it('renders the custom 404 page with a way back', () => {
    const { container, root } = renderIntoContainer(<NotFoundPage />);
    expect(container.textContent).toContain('Página não encontrada');
    // Sem isto o Next servia o 404 padrão em inglês, sem navegação — beco sem
    // saída fora do funil de landing.
    const links = Array.from(container.querySelectorAll('a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toContain('/');
    act(() => root.unmount());
  });
});
