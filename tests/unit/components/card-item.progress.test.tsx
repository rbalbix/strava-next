/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import CardItem from '../../../src/components/CardItem';
import { ToastProvider } from '../../../src/contexts/ToastContext';

function makeEquipment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chain',
    caption: 'Corrente',
    date: '2020-01-01T00:00:00Z',
    distance: 5000,
    movingTime: 100,
    ...overrides,
  } as any;
}

function mountCardItem(props: Record<string, unknown>) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(
      <ToastProvider>
        <ul>
          <CardItem {...(props as any)} />
        </ul>
      </ToastProvider>,
    );
  });
  return { container, root };
}

function getFill(container: HTMLElement): HTMLDivElement | null {
  return container.querySelector('div[style]') as HTMLDivElement | null;
}

describe('CardItem progress bar', () => {
  it('renders 50% width for a limit in kilometres with half consumed', () => {
    const { container, root } = mountCardItem({
      equipment: makeEquipment(),
      distance: 100000,
      movingTime: 1000,
      threshold: { value: 10, unit: 'km' },
    });

    const fill = getFill(container);
    expect(fill).not.toBeNull();
    expect(fill!.style.width).toBe('50%');

    act(() => root.unmount());
  });

  it('renders width from hours consumed when the limit is in hours', () => {
    const { container, root } = mountCardItem({
      equipment: makeEquipment({ distance: 0, movingTime: 18000 }), // 5h
      distance: 100000,
      movingTime: 18000,
      threshold: { value: 10, unit: 'h' },
    });

    const fill = getFill(container);
    expect(fill).not.toBeNull();
    expect(fill!.style.width).toBe('50%');

    act(() => root.unmount());
  });

  it('caps the width at 100% when the limit is exceeded', () => {
    const { container, root } = mountCardItem({
      equipment: makeEquipment({ distance: 20000 }), // 20km > 10km
      distance: 100000,
      movingTime: 1000,
      threshold: { value: 10, unit: 'km' },
    });

    const fill = getFill(container);
    expect(fill).not.toBeNull();
    expect(fill!.style.width).toBe('100%');

    act(() => root.unmount());
  });

  it('applies the warning band at 80% of a limit in hours', () => {
    const { container, root } = mountCardItem({
      equipment: makeEquipment({ distance: 0, movingTime: 28800 }), // 8h / 10h
      distance: 100000,
      movingTime: 28800,
      threshold: { value: 10, unit: 'h' },
    });

    const fill = getFill(container);
    expect(fill).not.toBeNull();
    expect(fill!.className).toContain('warning');
    expect(fill!.style.width).toBe('80%');

    act(() => root.unmount());
  });

  it('renders the row with moving time and zero distance', () => {
    const { container, root } = mountCardItem({
      equipment: makeEquipment({ distance: 0, movingTime: 3600 }),
      distance: 100000,
      movingTime: 3600,
      threshold: { value: 10, unit: 'h' },
    });

    expect(container.textContent).toContain('Corrente');
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();

    act(() => root.unmount());
  });

  it('keeps lubrification and cleaning messages ahead of the row', () => {
    const lub = mountCardItem({
      equipment: makeEquipment({ id: 'lub', distance: 0, movingTime: 3600 }),
      distance: 100000,
      movingTime: 3600,
      threshold: { value: 10, unit: 'h' },
    });
    expect(lub.container.textContent).toContain('Bike lubrificada.');
    expect(lub.container.querySelector('[role="progressbar"]')).toBeNull();
    act(() => lub.root.unmount());

    const clean = mountCardItem({
      equipment: makeEquipment({ id: 'clean', distance: 0, movingTime: 3600 }),
      distance: 100000,
      movingTime: 3600,
      threshold: { value: 10, unit: 'h' },
    });
    expect(clean.container.textContent).toContain('Bike limpinha.');
    expect(clean.container.querySelector('[role="progressbar"]')).toBeNull();
    act(() => clean.root.unmount());
  });

  it('mantém a trilha sem texto visível e anuncia o valor na unidade certa', () => {
    const { container, root } = mountCardItem({
      equipment: makeEquipment({ distance: 0, movingTime: 18000 }), // 5h
      distance: 100000,
      movingTime: 18000,
      threshold: { value: 10, unit: 'h' },
    });

    // Inspeção visual: o valor não é mais desenhado dentro da trilha…
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar?.textContent).toBe('');
    expect(bar?.querySelector('span')).toBeNull();

    // …mas o anúncio para leitores de tela continua na unidade do limite.
    expect(bar?.getAttribute('aria-valuetext')).toBe('5,0 h / 10,0 h');

    act(() => root.unmount());
  });

  it('keeps the styling hooks of the track', () => {
    const { container, root } = mountCardItem({
      equipment: makeEquipment({ distance: 0, movingTime: 18000 }), // 5h
      distance: 100000,
      movingTime: 18000,
      threshold: { value: 10, unit: 'h' },
    });

    const bar = container.querySelector('[role="progressbar"]');
    expect(bar?.className).toContain('progressBar');
    expect(bar?.querySelector('div')?.className).toContain('progressFill');

    // O rótulo interno (`.progressLabel`) foi removido: nenhum span pode
    // voltar para dentro da trilha.
    expect(bar?.querySelector('span')).toBeNull();

    act(() => root.unmount());
  });

  it('exposes a progressbar announcing the value in the right unit', () => {
    const hours = mountCardItem({
      equipment: makeEquipment({ distance: 0, movingTime: 18000 }),
      distance: 100000,
      movingTime: 18000,
      threshold: { value: 10, unit: 'h' },
    });
    const barHours = hours.container.querySelector(
      '[role="progressbar"]',
    ) as HTMLElement | null;
    expect(barHours).not.toBeNull();
    expect(barHours!.getAttribute('aria-valuetext')).toBe('5,0 h / 10,0 h');
    expect(barHours!.getAttribute('aria-valuemin')).toBe('0');
    expect(barHours!.getAttribute('aria-valuemax')).toBe('10');
    expect(barHours!.getAttribute('aria-valuenow')).toBe('5');
    expect(barHours!.closest('[aria-hidden]')).toBeNull();
    act(() => hours.root.unmount());

    const km = mountCardItem({
      equipment: makeEquipment(),
      distance: 100000,
      movingTime: 1000,
      threshold: { value: 10, unit: 'km' },
    });
    const barKm = km.container.querySelector(
      '[role="progressbar"]',
    ) as HTMLElement | null;
    expect(barKm).not.toBeNull();
    expect(barKm!.getAttribute('aria-valuetext')).toBe('5,00 km / 10,00 km');
    act(() => km.root.unmount());
  });

  it('keeps the distance and time badges in the current format', () => {
    const { container, root } = mountCardItem({
      equipment: makeEquipment(),
      distance: 100000,
      movingTime: 1000,
      threshold: { value: 10, unit: 'km' },
    });

    expect(container.textContent).toContain('5,00km');
    expect(container.textContent).toContain('⏱️ 00:01h');

    act(() => root.unmount());
  });
});
