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
  current: number;
  limit: number;
  unit: 'km' | 'h';
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
        current: 2200,
        limit: 2000,
        unit: 'km',
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

  it('activates the row with Enter and Space keys', () => {
    const onClose = vi.fn();
    const onViewEquipment = vi.fn();
    const items: AlertItem[] = [
      {
        gearId: 'gear-1',
        gearName: 'Bike A',
        equipmentId: 'chain',
        label: 'Corrente',
        current: 2200,
        limit: 2000,
        unit: 'km',
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

    const row = container.querySelector('[role="button"]') as HTMLElement;
    expect(row).not.toBeNull();

    act(() => {
      row.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });
    expect(onViewEquipment).toHaveBeenCalledWith('gear-1');

    act(() => {
      row.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
      );
    });
    expect(onViewEquipment).toHaveBeenCalledTimes(2);

    act(() => root.unmount());
  });

  it('renders current and limit with hours suffix and one decimal place', () => {
    const onClose = vi.fn();
    const onViewEquipment = vi.fn();
    const items: AlertItem[] = [
      {
        gearId: 'gear-1',
        gearName: 'Bike A',
        equipmentId: 'suspension',
        label: 'Suspensão:',
        current: 48,
        limit: 50,
        unit: 'h',
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

    expect(container.textContent).toContain('48,0 h / 50,0 h');
    expect(container.textContent).not.toContain('km');

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
        current: 2200,
        limit: 2000,
        unit: 'km',
        state: 'overdue',
      },
      {
        gearId: 'gear-2',
        gearName: 'Bike B',
        equipmentId: 'tire',
        label: 'Pneu',
        current: 1100,
        limit: 1000,
        unit: 'km',
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

  it('keeps two gears with the same name in separate groups', () => {
    const onClose = vi.fn();
    const onViewEquipment = vi.fn();
    const items: AlertItem[] = [
      {
        gearId: 'gear-1',
        gearName: 'Bike',
        equipmentId: 'chain',
        label: 'Corrente',
        current: 2200,
        limit: 2000,
        unit: 'km',
        state: 'overdue',
      },
      {
        gearId: 'gear-2',
        gearName: 'Bike',
        equipmentId: 'chain',
        label: 'Corrente',
        current: 1000,
        limit: 500,
        unit: 'km',
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

    // Um <li> de grupo por gear — homônimas não colapsam num grupo só.
    expect(container.querySelectorAll('li')).toHaveLength(2);

    const rows = container.querySelectorAll('[role="button"]');
    expect(rows).toHaveLength(2);
    act(() => {
      rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onViewEquipment).toHaveBeenCalledWith('gear-2');

    act(() => root.unmount());
  });

  it('preserva a ordem de inserção dos grupos com ids numéricos', () => {
    const onClose = vi.fn();
    const onViewEquipment = vi.fn();
    const items: AlertItem[] = [
      {
        gearId: '999',
        gearName: 'Bike Z',
        equipmentId: 'chain',
        label: 'Corrente',
        current: 2200,
        limit: 2000,
        unit: 'km',
        state: 'overdue',
      },
      {
        gearId: '111',
        gearName: 'Bike A',
        equipmentId: 'chain',
        label: 'Corrente',
        current: 3000,
        limit: 2000,
        unit: 'km',
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

    // Com acumulador objeto-literal, '999'/'111' enumerariam como
    // ['111', '999'] (chaves inteiras em JS); a ordem de inserção
    // (ordem do dashboard) deve ser preservada.
    const groups = container.querySelectorAll('li');
    expect(groups).toHaveLength(2);
    expect(groups[0].textContent).toContain('Bike Z');
    expect(groups[1].textContent).toContain('Bike A');

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
        current: 2200,
        limit: 2000,
        unit: 'km',
        state: 'overdue',
      },
      {
        gearId: 'gear-2',
        gearName: 'Bike B',
        equipmentId: 'tire',
        label: 'Pneu',
        current: 1100,
        limit: 0,
        unit: 'km',
        state: 'normal',
      },
      {
        gearId: 'gear-3',
        gearName: 'Bike C',
        equipmentId: 'brake',
        label: 'Freio',
        current: 500,
        limit: -1,
        unit: 'km',
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
        current: 2200,
        limit: 2000,
        unit: 'km',
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
