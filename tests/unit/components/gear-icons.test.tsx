/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

// `next/image` é pesado demais para jsdom e não é o alvo aqui: o que importa
// é que cada ícone monte o próprio elemento.
vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

import ChainIcon from '../../../src/components/ChainIcon';
import DiskIcon from '../../../src/components/DiskIcon';
import InitialInfo from '../../../src/components/InitialInfo';
import MountainBikeIcon from '../../../src/components/MountainBikeIcon';
import TireIcon from '../../../src/components/TireIcon';
import VeloIcon from '../../../src/components/VeloIcon';

function mount(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('gear icons', () => {
  it('renderiza os ícones de equipamento como presentacionais', () => {
    const { container, unmount } = mount(
      <>
        <ChainIcon className='chain' />
        <MountainBikeIcon />
        <DiskIcon />
        <TireIcon />
        <VeloIcon />
      </>,
    );

    const svgs = Array.from(container.querySelectorAll('svg'));
    expect(svgs).toHaveLength(1);
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
    expect(container.querySelector('svg.chain')).not.toBeNull();

    // Os demais ícones são imagens (next/image) e também montam.
    const images = Array.from(container.querySelectorAll('img'));
    expect(images).toHaveLength(4);
    expect(
      container.querySelector('img[alt="[icone de um ciclista de mountain bike]"]'),
    ).not.toBeNull();
    for (const image of images) {
      expect(image.getAttribute('src')).toBeTruthy();
    }

    unmount();
  });

  it('InitialInfo exibe o conteúdo de ajuda com as duas unidades de limite', () => {
    const { container, unmount } = mount(<InitialInfo />);

    expect(container.textContent).toContain(
      'Limites por Equipamento: km ou horas de pedalagem',
    );
    expect(container.textContent).toContain('quilômetros');
    expect(container.textContent).toContain('horas de pedalagem');

    unmount();
  });
});
