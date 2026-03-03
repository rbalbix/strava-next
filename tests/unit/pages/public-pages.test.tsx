/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import ContatoPage from '../../../src/pages/contato';
import FaqPage from '../../../src/pages/faq';
import ComoFuncionaPage from '../../../src/pages/como-funciona';
import PrivacidadePage from '../../../src/pages/privacidade';

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
    expect(container.textContent).toContain('Posso desconectar minha conta?');
    act(() => root.unmount());
  });

  it('renders como-funciona page', () => {
    const { container, root } = renderIntoContainer(<ComoFuncionaPage />);
    expect(container.textContent).toContain('Como funciona o GearLife');
    expect(container.textContent).toContain('Processamento de atividades');
    act(() => root.unmount());
  });

  it('renders privacidade page', () => {
    const { container, root } = renderIntoContainer(<PrivacidadePage />);
    expect(container.textContent).toContain('Privacidade');
    expect(container.textContent).toContain('Dados coletados');
    act(() => root.unmount());
  });
});
