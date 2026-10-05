/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { showToastMock } = vi.hoisted(() => ({ showToastMock: vi.fn() }));

// Redis em memória no lugar do Upstash: o serviço real de limites lê e grava
// aqui, então a cadeia UI → apiClient → serviço → armazenamento é real.
const store = new Map<string, unknown>();

vi.mock('../../src/services/redis', () => ({
  default: {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      store.set(key, JSON.parse(JSON.stringify(value)));
    },
  },
}));

// O cliente HTTP delega ao serviço real (sem rede), reproduzindo o que a
// página de API faz: `unit` ausente persiste como quilômetros.
vi.mock('../../src/lib/apiClient', () => ({
  apiClient: {
    getEquipmentThresholds: async () => {
      const service = await import('../../src/services/thresholds');
      return service.getEquipmentThresholds(1);
    },
    saveEquipmentThreshold: async (payload: {
      gearId: string;
      equipmentId: string;
      thresholdKm: number;
      unit?: 'km' | 'h';
    }) => {
      const service = await import('../../src/services/thresholds');
      return service.saveEquipmentThreshold(
        1,
        payload.gearId,
        payload.equipmentId,
        { value: payload.thresholdKm, unit: payload.unit ?? 'km' },
      );
    },
  },
}));

vi.mock('../../src/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('../../src/utils/clipboard', () => ({
  copyEventDetailsToClipboard: vi.fn(),
}));

import CardDetailModal from '../../src/components/CardDetailModal';
import CardItem from '../../src/components/CardItem';
import ThresholdAlertModal from '../../src/components/ThresholdAlertModal';
import { REDIS_KEYS } from '../../src/config/index';
import { getEquipmentThresholds } from '../../src/services/thresholds';

const ATHLETE_ID = 1;
const STORAGE_KEY = REDIS_KEYS.equipmentThresholds(ATHLETE_ID);

const gearStat = {
  id: 'gear-1',
  name: 'Bike A',
  activityType: 'RoadRide',
  count: 10,
  distance: 100000,
  movingTime: 3600,
  equipments: [
    {
      id: 'chain',
      caption: 'Corrente',
      date: new Date().toISOString(),
      distance: 50000,
      movingTime: 1800,
    },
  ],
} as any;

async function mountModal() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<CardDetailModal gearStat={gearStat} onClose={() => {}} />);
  });
  // Flush das promises do serviço (Redis em memória) sem espera de relógio.
  await act(async () => {});

  return {
    container,
    root,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function openEditor(container: HTMLElement) {
  const opener = container.querySelector<HTMLButtonElement>(
    'button[aria-label^="Abrir editor"]',
  );
  expect(opener).not.toBeNull();
  act(() => {
    fireEvent.click(opener as HTMLButtonElement);
  });
}

function findRadio(container: HTMLElement, unit: 'km' | 'h') {
  const radio = Array.from(container.querySelectorAll('[role="radio"]')).find(
    (el) => el.textContent === unit,
  ) as HTMLButtonElement | undefined;
  expect(radio).not.toBeUndefined();
  return radio as HTMLButtonElement;
}

function valueInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>(
    'input[type="number"]',
  );
  expect(input).not.toBeNull();
  return input as HTMLInputElement;
}

async function saveThroughEditor(
  container: HTMLElement,
  unit: 'km' | 'h',
  value: string,
) {
  openEditor(container);
  act(() => {
    fireEvent.click(findRadio(container, unit));
  });
  act(() => {
    fireEvent.input(valueInput(container), { target: { value } });
  });
  await act(async () => {
    fireEvent.click(
      container.querySelector(
        'button[aria-label="Salvar limite"]',
      ) as HTMLButtonElement,
    );
  });
}

function mountCardItem(threshold: { value: number; unit: 'km' | 'h' }, equipment: any) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <ul>
        <CardItem
          equipment={equipment}
          distance={0}
          movingTime={0}
          threshold={threshold}
        />
      </ul>,
    );
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function mountAlert(item: Record<string, unknown>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <ThresholdAlertModal
        items={[item as any]}
        onClose={() => {}}
        onViewEquipment={() => {}}
      />,
    );
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

beforeEach(() => {
  store.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('fluxos da feature limite por unidade', () => {
  it('percorre o fluxo em horas: criação, recarregamento, barra e alerta', async () => {
    // 1. Criação pelo editor, escolhendo horas
    const modal = await mountModal();
    await saveThroughEditor(modal.container, 'h', '48');
    expect(showToastMock).toHaveBeenCalledWith('Limite salvo', 'success');

    // Persistência: par { value, unit } no armazenamento
    expect(store.get(STORAGE_KEY)).toEqual({
      'gear-1': { chain: { value: 48, unit: 'h' } },
    });

    // 2. Recarregamento: releitura devolve o par e o editor reabre preenchido
    expect(await getEquipmentThresholds(ATHLETE_ID)).toEqual({
      'gear-1': { chain: { value: 48, unit: 'h' } },
    });
    modal.unmount();

    const reloaded = await mountModal();
    openEditor(reloaded.container);
    expect(valueInput(reloaded.container).value).toBe('48');
    expect(
      findRadio(reloaded.container, 'h').getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      findRadio(reloaded.container, 'km').getAttribute('aria-checked'),
    ).toBe('false');
    reloaded.unmount();

    // 3. Barra de progresso: 50 h pedaladas contra o limite de 48 h
    const equipmentHours = {
      id: 'chain',
      caption: 'Corrente',
      date: new Date().toISOString(),
      distance: 0,
      movingTime: 180000, // 50 h
    } as any;
    const bar = mountCardItem({ value: 48, unit: 'h' }, equipmentHours);
    const progress = bar.container.querySelector(
      '[role="progressbar"]',
    ) as HTMLElement;
    expect(progress.getAttribute('aria-valuetext')).toBe('50,0 h / 48,0 h');
    expect(progress.getAttribute('aria-valuemax')).toBe('48');
    expect(progress.getAttribute('aria-valuenow')).toBe('48');
    // Inspeção visual: o par valor/limite não é mais desenhado na trilha —
    // o anúncio aria-valuetext acima é o que carrega o valor para a11y.
    expect(bar.container.textContent).not.toContain('50,0 h / 48,0 h');
    bar.unmount();

    // 4. Alerta na unidade escolhida
    const alert = mountAlert({
      gearId: 'gear-1',
      gearName: 'Bike A',
      equipmentId: 'chain',
      label: 'Corrente',
      current: 50,
      limit: 48,
      unit: 'h',
      state: 'overdue',
    });
    expect(alert.container.textContent).toContain('50,0 h / 48,0 h');
    alert.unmount();
  });

  it('percorre o fluxo em quilômetros: criação, recarregamento, barra e alerta', async () => {
    // 1. Criação pelo editor, escolhendo quilômetros
    const modal = await mountModal();
    await saveThroughEditor(modal.container, 'km', '200');
    expect(showToastMock).toHaveBeenCalledWith('Limite salvo', 'success');

    expect(store.get(STORAGE_KEY)).toEqual({
      'gear-1': { chain: { value: 200, unit: 'km' } },
    });

    // 2. Recarregamento
    expect(await getEquipmentThresholds(ATHLETE_ID)).toEqual({
      'gear-1': { chain: { value: 200, unit: 'km' } },
    });
    modal.unmount();

    const reloaded = await mountModal();
    openEditor(reloaded.container);
    expect(valueInput(reloaded.container).value).toBe('200');
    expect(
      findRadio(reloaded.container, 'km').getAttribute('aria-checked'),
    ).toBe('true');
    expect(reloaded.container.querySelector<HTMLInputElement>(
      'input[type="number"]',
    )?.getAttribute('step')).toBe('100');
    reloaded.unmount();

    // 3. Barra de progresso: 300 km contra o limite de 200 km
    const equipmentKm = {
      id: 'chain',
      caption: 'Corrente',
      date: new Date().toISOString(),
      distance: 300000, // 300 km
      movingTime: 0,
    } as any;
    const bar = mountCardItem({ value: 200, unit: 'km' }, equipmentKm);
    const progress = bar.container.querySelector(
      '[role="progressbar"]',
    ) as HTMLElement;
    expect(progress.getAttribute('aria-valuetext')).toBe(
      '300,00 km / 200,00 km',
    );
    // Inspeção visual: o par valor/limite não é mais desenhado na trilha —
    // o anúncio aria-valuetext acima é o que carrega o valor para a11y.
    expect(bar.container.textContent).not.toContain('300,00 km / 200,00 km');
    bar.unmount();

    // 4. Alerta na unidade escolhida
    const alert = mountAlert({
      gearId: 'gear-1',
      gearName: 'Bike A',
      equipmentId: 'chain',
      label: 'Corrente',
      current: 300,
      limit: 200,
      unit: 'km',
      state: 'overdue',
    });
    expect(alert.container.textContent).toContain('300,00 km / 200,00 km');
    alert.unmount();
  });

  it('mantém registro antigo numérico em quilômetros ao reler (retrocompatibilidade)', async () => {
    // Shape anterior à feature: número puro, unidade implícita em km.
    store.set(STORAGE_KEY, { 'gear-1': { chain: 120 } });

    const reloaded = await getEquipmentThresholds(ATHLETE_ID);
    expect(reloaded).toEqual({
      'gear-1': { chain: { value: 120, unit: 'km' } },
    });

    const bar = mountCardItem(
      reloaded['gear-1'].chain,
      {
        id: 'chain',
        caption: 'Corrente',
        date: new Date().toISOString(),
        distance: 60000, // 60 km
        movingTime: 0,
      } as any,
    );
    const progress = bar.container.querySelector(
      '[role="progressbar"]',
    ) as HTMLElement;
    expect(progress.getAttribute('aria-valuetext')).toBe(
      '60,00 km / 120,00 km',
    );
    bar.unmount();
  });
});
