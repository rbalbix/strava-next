/* @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Stats from '../../../src/components/Stats';
import { AuthContext } from '../../../src/contexts/AuthContext';
import * as useAutoSyncModule from '../../../src/hooks/useAutoSync';

vi.mock('../../../src/components/Card', () => ({
  default: ({ name }: { name: string }) => <div>Card: {name}</div>,
}));

vi.mock('../../../src/components/DiskIcon', () => ({
  default: () => <span>disk</span>,
}));
vi.mock('../../../src/components/TireIcon', () => ({
  default: () => <span>tire</span>,
}));
vi.mock('../../../src/components/VeloIcon', () => ({
  default: () => <span>velo</span>,
}));

vi.mock('../../../src/hooks/useAutoSync');

function makeAuthContext(overrides: Record<string, unknown> = {}) {
  return {
    codeReturned: 'code',
    oauth_state: 'state',
    athlete: null,
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

function makeDashboardFixture({
  distance = 0,
  movingTime = 0,
  threshold,
}: {
  distance?: number;
  movingTime?: number;
  threshold: { value: number; unit: 'km' | 'h' };
}) {
  return {
    athlete: { id: 1 } as any,
    athleteStats: {} as any,
    hasGear: true,
    hasActivities: true,
    gearStats: [
      {
        id: 'bike-1',
        name: 'Bike One',
        activityType: 'Ride',
        count: 1,
        distance,
        movingTime,
        equipments: [
          {
            id: 'chain',
            caption: 'corrente:',
            show: 'Corrente',
            distance,
            movingTime,
          },
        ],
      },
    ],
    equipmentThresholds: {
      'bike-1': { chain: threshold },
    },
  } as any;
}

async function renderStats(
  root: ReturnType<typeof createRoot>,
  authValue: ReturnType<typeof makeAuthContext>,
) {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={authValue}>
        <Stats />
      </AuthContext.Provider>,
    );
    await Promise.resolve();
  });
}

describe('Stats component', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows empty-state when athlete has no gear', async () => {
    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
        dashboard: {
          athlete: { id: 1 } as any,
          athleteStats: {} as any,
          hasGear: false,
          hasActivities: true,
          gearStats: [],
        },
        isLoading: false,
        isError: null,
        mutate: vi.fn(),
    });

    const authValue = makeAuthContext();
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Nenhum equipamento cadastrado no Strava');
    act(() => {
      root.unmount();
    });
  });

  it('shows empty-state when athlete has no activities', async () => {
    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
        dashboard: {
          athlete: { id: 1 } as any,
          athleteStats: {} as any,
          hasGear: true,
          hasActivities: false,
          gearStats: [],
        },
        isLoading: false,
        isError: null,
        mutate: vi.fn(),
    });

    const authValue = makeAuthContext();
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Nenhuma atividade criada no Strava');
    act(() => {
      root.unmount();
    });
  });

  it('renders cards when dashboard returns gear stats', async () => {
    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
        dashboard: {
          athlete: { id: 1 } as any,
          athleteStats: {} as any,
          hasGear: true,
          hasActivities: true,
          gearStats: [
            {
              id: 'bike-1',
              name: 'Bike One',
              activityType: 'Ride',
              count: 1,
              distance: 1000,
              movingTime: 100,
              equipments: [],
            },
          ],
        },
        isLoading: false,
        isError: null,
        mutate: vi.fn(),
    });

    const authValue = makeAuthContext();
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Card: Bike One');
    act(() => {
      root.unmount();
    });
  });

  it('signs out when dashboard returns error and there is no cache', async () => {
    const signOut = vi.fn();
    const setErrorInfo = vi.fn();
    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
        dashboard: undefined,
        isLoading: false,
        isError: new Error('boom'),
        mutate: vi.fn(),
    });

    const authValue = makeAuthContext({ signOut, setErrorInfo });
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(setErrorInfo).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
    act(() => {
      root.unmount();
    });
  });

  it('signs out when dashboard returns 401 error even if cache exists', async () => {
    sessionStorage.setItem('athlete', JSON.stringify({ id: 2 }));
    sessionStorage.setItem('athleteStats', JSON.stringify({}));
    sessionStorage.setItem('gearStats', JSON.stringify([]));
    sessionStorage.setItem('athleteCacheTime', Date.now().toString());

    const signOut = vi.fn();
    const setErrorInfo = vi.fn();
    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
        dashboard: undefined,
        isLoading: false,
        isError: new Error('Request failed: HTTP 401'),
        mutate: vi.fn(),
    });

    const authValue = makeAuthContext({ signOut, setErrorInfo });
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authValue}>
          <Stats />
        </AuthContext.Provider>,
      );
      await Promise.resolve();
    });

    expect(setErrorInfo).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
    act(() => {
      root.unmount();
    });
  });

  it('opens the alert when the limit in hours is overdue', async () => {
    const openModal = vi.fn();
    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
      dashboard: makeDashboardFixture({
        distance: 0,
        movingTime: 180000, // 50h pedaladas
        threshold: { value: 48, unit: 'h' },
      }),
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    });

    const authValue = makeAuthContext({ openModal });
    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(root, authValue);

    expect(openModal).toHaveBeenCalledTimes(1);
    expect(openModal).toHaveBeenCalledWith(
      'threshold-alert',
      expect.objectContaining({
        items: [
          expect.objectContaining({
            equipmentId: 'chain',
            unit: 'h',
            current: 50,
            limit: 48,
            state: 'overdue',
          }),
        ],
      }),
    );

    act(() => {
      root.unmount();
    });
  });

  it('opens the alert when the limit in kilometres is overdue', async () => {
    const openModal = vi.fn();
    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
      dashboard: makeDashboardFixture({
        distance: 300000, // 300 km
        threshold: { value: 200, unit: 'km' },
      }),
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    });

    const authValue = makeAuthContext({ openModal });
    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(root, authValue);

    expect(openModal).toHaveBeenCalledTimes(1);
    expect(openModal).toHaveBeenCalledWith(
      'threshold-alert',
      expect.objectContaining({
        items: [
          expect.objectContaining({
            unit: 'km',
            current: 300,
            limit: 200,
            state: 'overdue',
          }),
        ],
      }),
    );

    act(() => {
      root.unmount();
    });
  });

  it('does not open the alert when the limit is zero', async () => {
    const openModal = vi.fn();
    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
      dashboard: makeDashboardFixture({
        distance: 300000,
        threshold: { value: 0, unit: 'km' },
      }),
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    });

    const authValue = makeAuthContext({ openModal });
    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(root, authValue);

    expect(openModal).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it('stops alerting an equipment that goes back below the limit', async () => {
    const openModal = vi.fn();
    const closeModal = vi.fn();

    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
      dashboard: makeDashboardFixture({
        distance: 300000,
        threshold: { value: 200, unit: 'km' },
      }),
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    });

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(root, makeAuthContext({ openModal, closeModal }));
    expect(openModal).toHaveBeenCalledTimes(1);
    expect(closeModal).not.toHaveBeenCalled();

    // Limite ainda configurado, mas consumo volta a ficar abaixo dele.
    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
      dashboard: makeDashboardFixture({
        distance: 100000,
        threshold: { value: 200, unit: 'km' },
      }),
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    });
    await renderStats(
      root,
      makeAuthContext({ activeModal: 'threshold-alert', openModal, closeModal }),
    );

    expect(openModal).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it('alerta cada bike separadamente quando a mesma peça vence em momentos distintos', async () => {
    const openModal = vi.fn();

    const twoGearDashboard = (distanceA: number, distanceB: number) => {
      const base = makeDashboardFixture({
        distance: distanceA,
        threshold: { value: 200, unit: 'km' },
      });
      return {
        ...base,
        gearStats: [
          base.gearStats[0],
          {
            ...base.gearStats[0],
            id: 'bike-2',
            name: 'Bike Two',
            distance: distanceB,
            equipments: [
              { ...base.gearStats[0].equipments[0], distance: distanceB },
            ],
          },
        ],
        equipmentThresholds: {
          'bike-1': { chain: { value: 200, unit: 'km' } },
          'bike-2': { chain: { value: 200, unit: 'km' } },
        },
      } as any;
    };

    // Bike 1 vencida, bike 2 normal → primeiro alerta.
    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
      dashboard: twoGearDashboard(300000, 100000),
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    });
    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(root, makeAuthContext({ openModal }));

    expect(openModal).toHaveBeenCalledTimes(1);

    // Bike 1 normalizada; bike 2 AGORA vencida → precisa alertar de novo.
    // Com a chave antiga (só equipmentId) o filtro engolia este alerta.
    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
      dashboard: twoGearDashboard(100000, 300000),
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    });
    await renderStats(root, makeAuthContext({ openModal }));

    expect(openModal).toHaveBeenCalledTimes(2);
    expect(openModal).toHaveBeenLastCalledWith(
      'threshold-alert',
      expect.objectContaining({
        items: [
          expect.objectContaining({ gearId: 'bike-2', equipmentId: 'chain' }),
        ],
      }),
    );

    act(() => {
      root.unmount();
    });
  });

  it('não monta alerta para equipamento sem limite configurado', async () => {
    const openModal = vi.fn();
    const dashboard = makeDashboardFixture({
      distance: 300000,
      threshold: { value: 200, unit: 'km' },
    });
    dashboard.equipmentThresholds = {};

    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
      dashboard,
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    });

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(root, makeAuthContext({ openModal }));

    expect(openModal).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it('descarta registro legado sem valor numérico ao montar o alerta', async () => {
    const openModal = vi.fn();
    const dashboard = makeDashboardFixture({
      distance: 300000,
      threshold: { value: 200, unit: 'km' },
    });
    // Defesa: registro salvo sem o par { value, unit } não gera alerta.
    dashboard.equipmentThresholds = { 'bike-1': { chain: {} } };

    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
      dashboard,
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    });

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(root, makeAuthContext({ openModal }));

    expect(openModal).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it('ignora cache corrompido no sessionStorage e segue com o dashboard', async () => {
    sessionStorage.setItem('athleteCacheTime', Date.now().toString());
    sessionStorage.setItem('athlete', '{corrompido');
    sessionStorage.setItem('athleteStats', '{}');
    sessionStorage.setItem('gearStats', '[]');

    vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
      dashboard: makeDashboardFixture({
        distance: 1000,
        threshold: { value: 200, unit: 'km' },
      }),
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    });

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(root, makeAuthContext());

    expect(container.textContent).toContain('Card: Bike One');

    act(() => {
      root.unmount();
    });
  });
});
