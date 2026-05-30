/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import HowItWorksContent from '../../../src/components/HowItWorksContent';

vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

type ReactElement = React.ReactElement;

function mount(el: ReactElement) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(el));
  return { container, root };
}

describe('HowItWorksContent', () => {
  it('renders the shared learning content headings and sections', () => {
    const { container, root } = mount(<HowItWorksContent />);

    expect(container.textContent).toContain(
      'Como usar o aplicativo para monitorar equipamentos usando as atividades do Strava',
    );
    expect(container.textContent).toContain('Passo 1: Acesso Inicial e Login');
    expect(container.textContent).toContain('Passo 2: Lista de Equipamentos');
    expect(container.textContent).toContain(
      'Passo 4: Lista de Códigos dos Componentes',
    );
    expect(container.textContent).toContain(
      'Esta lista pode ser aberta clicando no ícone',
    );
    act(() => root.unmount());
  });

  it('renders the reference link when showReferenceLink is true', () => {
    const { container, root } = mount(<HowItWorksContent showReferenceLink />);

    expect(container.textContent).toContain(
      'Leia o guia completo em Como funciona',
    );
    expect(container.querySelector('a[href="/como-funciona"]')).toBeTruthy();
    act(() => root.unmount());
  });
});
