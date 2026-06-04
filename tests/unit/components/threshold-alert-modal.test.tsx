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

    expect(container.textContent).toContain('Nenhum equipamento atrasado');
    expect(container.textContent).toContain('Fechar');

    act(() => root.unmount());
  });

  it('renders one item and calls onViewEquipment when button is clicked', () => {
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

    const button = container.querySelector('button');
    expect(button).not.toBeNull();

    const buttons = container.querySelectorAll('button');
    const viewButton = Array.from(buttons).find(
      (button) => button.textContent === 'Ver equipamento',
    );
    expect(viewButton).not.toBeNull();
    act(() =>
      viewButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
    expect(onViewEquipment).toHaveBeenCalledWith('gear-1');

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

    act(() => root.unmount());
  });
});
