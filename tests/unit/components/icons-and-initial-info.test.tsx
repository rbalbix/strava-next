/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import ChainIcon from '../../../src/components/ChainIcon';
import DiskIcon from '../../../src/components/DiskIcon';
import InitialInfo from '../../../src/components/InitialInfo';
import TireIcon from '../../../src/components/TireIcon';
import VeloIcon from '../../../src/components/VeloIcon';

vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

function mount(el: React.ReactElement) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(el));
  return { container, root };
}

describe('icon and onboarding components', () => {
  it('ChainIcon renders svg with custom class and aria label', () => {
    const { container, root } = mount(<ChainIcon className='chain' />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('class')).toBe('chain');
    expect(svg?.getAttribute('aria-label')).toBe('Chain icon');
    act(() => root.unmount());
  });

  it('DiskIcon, TireIcon and VeloIcon render expected image sources', () => {
    const disk = mount(<DiskIcon />);
    expect(disk.container.querySelector('img')?.getAttribute('src')).toBe('/disk.svg');
    act(() => disk.root.unmount());

    const tire = mount(<TireIcon />);
    expect(tire.container.querySelector('img')?.getAttribute('src')).toBe('/tire.svg');
    act(() => tire.root.unmount());

    const velo = mount(<VeloIcon />);
    expect(velo.container.querySelector('img')?.getAttribute('src')).toBe('/velo.gif');
    act(() => velo.root.unmount());
  });

  it('InitialInfo renders onboarding steps and screenshots', () => {
    const { container, root } = mount(<InitialInfo />);
    expect(container.textContent).toContain('Como usar o aplicativo');
    expect(container.textContent).toContain('Passo 1: Acesso Inicial e Login');
    expect(container.textContent).toContain('Passo 4: Lista de Códigos dos Componentes');
    expect(container.querySelectorAll('img').length).toBeGreaterThanOrEqual(7);
    act(() => root.unmount());
  });
});
