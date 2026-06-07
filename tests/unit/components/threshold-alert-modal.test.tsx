/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import ThresholdAlertModal from '../../../src/components/ThresholdAlertModal';

type AlertItem = {
  gearId: string;
  gearName: string;
  equipmentId: string;
  label: string;
  distanceKm: number;
  thresholdKm: number;
  state: 'normal' | 'warning' | 'overdue';
};

describe('ThresholdAlertModal', () => {
  function mount(element: React.ReactElement) {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(element));
    document.body.appendChild(container);
    return { container, root };
  }

  it('renders a message when there are no overdue items', () => {
    const onClose = vi.fn();
    const onViewEquipment = vi.fn();
    const { container, root } = mount(
      <ThresholdAlertModal
        items={[]}
        onClose={onClose}
        onViewEquipment={onViewEquipment}
      />,
    );

    expect(container.textContent).toContain(
      'Equipamentos que atingiram o limite configurado',
    );
    expect(container.textContent).toContain(
      'Nenhum equipamento com limite configurado no momento',
    );

    // Verifica se o botão de fechar existe
    const closeButton = container.querySelector(
      '[aria-label="Fechar alerta de limite"]',
    );
    expect(closeButton).not.toBeNull();

    act(() => root.unmount());
  });

  it('renders one item and calls onViewEquipment when clicked', () => {
    const onClose = vi.fn();
    const onViewEquipment = vi.fn();
    const items: AlertItem[] = [
      {
        gearId: 'gear-1',
        gearName: 'Bike A',
        equipmentId: 'chain',
        label: 'Corrente',
        distanceKm: 2200,
        thresholdKm: 2000,
        state: 'overdue',
      },
    ];
    const { container, root } = mount(
      <ThresholdAlertModal
        items={items}
        onClose={onClose}
        onViewEquipment={onViewEquipment}
      />,
    );

    expect(container.textContent).toContain('Bike A');
    expect(container.textContent).toContain('Corrente');
    expect(container.textContent).toContain('2.200,00 km / 2.000,00 km');

    // Encontra e clica no item
    const clickableDiv = container.querySelector('[role="button"]');
    expect(clickableDiv).not.toBeNull();

    act(() =>
      clickableDiv?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );

    expect(onViewEquipment).toHaveBeenCalledWith('gear-1');
    expect(onViewEquipment).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });

  it('renders multiple items', () => {
    const onClose = vi.fn();
    const onViewEquipment = vi.fn();
    const items: AlertItem[] = [
      {
        gearId: 'gear-1',
        gearName: 'Bike A',
        equipmentId: 'chain',
        label: 'Corrente',
        distanceKm: 2200,
        thresholdKm: 2000,
        state: 'overdue',
      },
      {
        gearId: 'gear-2',
        gearName: 'Bike B',
        equipmentId: 'tire',
        label: 'Pneu',
        distanceKm: 1100,
        thresholdKm: 1000,
        state: 'overdue',
      },
    ];
    const { container, root } = mount(
      <ThresholdAlertModal
        items={items}
        onClose={onClose}
        onViewEquipment={onViewEquipment}
      />,
    );

    expect(container.textContent).toContain('Bike A');
    expect(container.textContent).toContain('Bike B');
    expect(container.textContent).toContain('Pneu');
    expect(container.textContent).toContain('Corrente');

    const clickableDivs = container.querySelectorAll('[role="button"]');
    expect(clickableDivs.length).toBe(2);

    act(() => root.unmount());
  });

  it('filters items with thresholdKm <= 0', () => {
    const onClose = vi.fn();
    const onViewEquipment = vi.fn();
    const items: AlertItem[] = [
      {
        gearId: 'gear-1',
        gearName: 'Bike A',
        equipmentId: 'chain',
        label: 'Corrente',
        distanceKm: 2200,
        thresholdKm: 2000,
        state: 'overdue',
      },
      {
        gearId: 'gear-2',
        gearName: 'Bike B',
        equipmentId: 'tire',
        label: 'Pneu',
        distanceKm: 1100,
        thresholdKm: 0,
        state: 'normal',
      },
      {
        gearId: 'gear-3',
        gearName: 'Bike C',
        equipmentId: 'brake',
        label: 'Freio',
        distanceKm: 500,
        thresholdKm: -1,
        state: 'normal',
      },
    ];
    const { container, root } = mount(
      <ThresholdAlertModal
        items={items}
        onClose={onClose}
        onViewEquipment={onViewEquipment}
      />,
    );

    expect(container.textContent).toContain('Bike A');
    expect(container.textContent).toContain('Corrente');
    expect(container.textContent).not.toContain('Bike B');
    expect(container.textContent).not.toContain('Pneu');
    expect(container.textContent).not.toContain('Bike C');
    expect(container.textContent).not.toContain('Freio');

    const clickableDivs = container.querySelectorAll('[role="button"]');
    expect(clickableDivs.length).toBe(1);

    act(() => root.unmount());
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const onViewEquipment = vi.fn();
    const items: AlertItem[] = [
      {
        gearId: 'gear-1',
        gearName: 'Bike A',
        equipmentId: 'chain',
        label: 'Corrente',
        distanceKm: 2200,
        thresholdKm: 2000,
        state: 'overdue',
      },
    ];
    const { container, root } = mount(
      <ThresholdAlertModal
        items={items}
        onClose={onClose}
        onViewEquipment={onViewEquipment}
      />,
    );

    const closeButton = container.querySelector(
      '[aria-label="Fechar alerta de limite"]',
    );
    expect(closeButton).not.toBeNull();

    act(() =>
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );

    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });
});
