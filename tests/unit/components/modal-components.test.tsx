/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import CardDetailModal from '../../../src/components/CardDetailModal';
import CardItem from '../../../src/components/CardItem';
import ComponentInfo from '../../../src/components/ComponentInfo';
import InitialInfoModal from '../../../src/components/InitialInfoModal';
import { AuthContext } from '../../../src/contexts/AuthContext';
import { Equipments } from '../../../src/services/equipment';
import {
  copyEventDetailsToClipboard,
  copyTextToClipboard,
} from '../../../src/services/utils';

vi.mock('../../../src/components/InitialInfo', () => ({ default: () => <div>initial-info</div> }));
vi.mock('../../../src/services/utils', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return {
    ...mod,
    copyTextToClipboard: vi.fn(),
    copyEventDetailsToClipboard: vi.fn(),
  };
});

function ctx(overrides: Record<string, unknown> = {}) {
  return {
    codeReturned: 'code',
    oauth_state: 'state',
    athlete: { id: 1 },
    athleteStats: null,
    codeError: null,
    activeModal: null,
    modalData: null,
    setAthleteInfo: vi.fn(),
    setAthleteInfoStats: vi.fn(),
    setErrorInfo: vi.fn(),
    signOut: vi.fn(),
    openModal: vi.fn(),
    closeModal: vi.fn(),
    ...overrides,
  } as any;
}

function mount(el: React.ReactElement) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(el));
  return { container, root };
}

describe('modal child components', () => {
  it('InitialInfoModal renders content and triggers close', () => {
    const closeModal = vi.fn();
    const { container, root } = mount(
      <AuthContext.Provider value={ctx({ closeModal })}>
        <InitialInfoModal />
      </AuthContext.Provider>,
    );

    expect(container.textContent).toContain('initial-info');
    const close = container.querySelector('[style*="cursor: pointer"]') as HTMLElement;
    act(() => close.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(closeModal).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('CardDetailModal renders totals and close callback for ride', () => {
    const onClose = vi.fn();
    const { container, root } = mount(
      <CardDetailModal
        onClose={onClose}
        gearStat={{
          id: 'g1',
          name: 'Bike',
          activityType: 'Ride',
          count: 2,
          distance: 10000,
          movingTime: 3600,
          equipments: [
            {
              id: Equipments.Chain.id,
              show: Equipments.Chain.show,
              caption: Equipments.Chain.caption,
              date: '2026-01-01T00:00:00Z',
              distance: 1000,
              movingTime: 100,
            },
          ],
        } as any}
      />,
    );

    expect(container.textContent).toContain('Bike');
    expect(container.textContent).toContain('Atividades');
    expect(container.textContent).toContain('Distância Total');
    expect(container.querySelector('[data-testid="icon-bike"]')).toBeTruthy();
    expect(container.querySelectorAll('ul li').length).toBe(1);
    const close = container.querySelector('[style*="cursor: pointer"]') as HTMLElement;
    act(() => close.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('CardDetailModal supports non-ride activity without rendering timeline items', () => {
    const onClose = vi.fn();
    const { container, root } = mount(
      <CardDetailModal
        onClose={onClose}
        gearStat={{
          id: 'g2',
          name: 'Run',
          activityType: 'Run',
          count: 1,
          distance: 5000,
          movingTime: 1800,
          equipments: [
            {
              id: Equipments.Chain.id,
              show: Equipments.Chain.show,
              caption: Equipments.Chain.caption,
              date: '2026-01-01T00:00:00Z',
              distance: 1000,
              movingTime: 100,
            },
          ],
        } as any}
      />,
    );

    expect(container.textContent).toContain('Run');
    expect(container.textContent).toContain('Tempo Total');
    expect(container.querySelector('[data-testid="icon-run"]')).toBeTruthy();
    expect(container.querySelectorAll('ul li').length).toBe(0);
    const close = container.querySelector('[style*="cursor: pointer"]') as HTMLElement;
    act(() => close.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('CardDetailModal renders mountain bike icon and timeline for MountainBikeRide', () => {
    const onClose = vi.fn();
    const { container, root } = mount(
      <CardDetailModal
        onClose={onClose}
        gearStat={{
          id: 'g3',
          name: 'MTB',
          activityType: 'MountainBikeRide',
          count: 1,
          distance: 7000,
          movingTime: 2000,
          equipments: [
            {
              id: Equipments.Chain.id,
              show: Equipments.Chain.show,
              caption: Equipments.Chain.caption,
              date: '2026-01-01T00:00:00Z',
              distance: 1000,
              movingTime: 100,
            },
          ],
        } as any}
      />,
    );

    expect(
      container.querySelector('[data-testid="icon-mountain-bike"]'),
    ).toBeTruthy();
    expect(container.querySelectorAll('ul li').length).toBe(1);
    act(() => root.unmount());
  });

  it('ComponentInfo renders equipments and copies code on row click', () => {
    const closeModal = vi.fn();
    const { container, root } = mount(
      <AuthContext.Provider value={ctx({ closeModal })}>
        <ComponentInfo />
      </AuthContext.Provider>,
    );

    expect(container.textContent).toContain('Componentes:');
    const firstRow = container.querySelector('tbody tr') as HTMLTableRowElement;
    expect(firstRow).toBeTruthy();
    act(() => firstRow.click());
    expect(copyTextToClipboard).toHaveBeenCalledTimes(1);

    const close = container.querySelector('[style*="cursor: pointer"]') as HTMLElement;
    act(() => close.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(closeModal).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('CardItem covers null, zero-distance and click-to-copy branches', () => {
    const noDate = mount(
      <CardItem equipment={{ id: 'x', show: 'x', caption: 'x' }} distance={1000} movingTime={100} />,
    );
    expect(noDate.container.innerHTML).toBe('');
    act(() => noDate.root.unmount());

    const lubrified = mount(
      <CardItem
        equipment={{
          id: Equipments.Lubrification.id,
          show: Equipments.Lubrification.show,
          caption: Equipments.Lubrification.caption,
          date: '2026-01-01T00:00:00Z',
          distance: 0,
          movingTime: 0,
        }}
        distance={5000}
        movingTime={500}
      />,
    );
    expect(lubrified.container.textContent).toContain('Bike lubrificada.');
    act(() => lubrified.root.unmount());

    const cleaned = mount(
      <CardItem
        equipment={{
          id: Equipments.Clean.id,
          show: Equipments.Clean.show,
          caption: Equipments.Clean.caption,
          date: '2026-01-02T00:00:00Z',
          distance: 0,
          movingTime: 0,
        }}
        distance={5000}
        movingTime={500}
      />,
    );
    expect(cleaned.container.textContent).toContain('Bike limpinha.');
    act(() => cleaned.root.unmount());

    const zeroDistanceOther = mount(
      <CardItem
        equipment={{
          id: Equipments.Chain.id,
          show: Equipments.Chain.show,
          caption: Equipments.Chain.caption,
          date: '2026-01-01T00:00:00Z',
          distance: 0,
          movingTime: 0,
        }}
        distance={5000}
        movingTime={500}
      />,
    );
    expect(zeroDistanceOther.container.innerHTML).toBe('');
    act(() => zeroDistanceOther.root.unmount());

    const normal = mount(
      <CardItem
        equipment={{
          id: Equipments.Chain.id,
          show: Equipments.Chain.show,
          caption: Equipments.Chain.caption,
          date: '2026-01-01T00:00:00Z',
          distance: 1000,
          movingTime: 100,
        }}
        distance={5000}
        movingTime={500}
      />,
    );
    const item = normal.container.querySelector('li') as HTMLLIElement;
    act(() => item.click());
    expect(copyEventDetailsToClipboard).toHaveBeenCalledTimes(1);
    expect(normal.container.textContent).toContain(Equipments.Chain.caption);
    act(() => normal.root.unmount());
  });
});
