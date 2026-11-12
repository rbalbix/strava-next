/* @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Stats from '../../../src/components/Stats';
import { AuthContext } from '../../../src/contexts/AuthContext';
import * as useAutoSyncModule from '../../../src/hooks/useAutoSync';

// D14 — banner warning de código não reconhecido: copy, link, ciclo de
// vida da dispensa (Set por activityId:word) e pintura a partir do cache.

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

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

type BannerCode = {
  activityId: number;
  gearName: string;
  startDate: string;
  word: string;
  suggestion: string;
};

const CODE: BannerCode = {
  activityId: 42,
  gearName: 'Bike A',
  startDate: '2026-11-05T10:00:00Z',
  word: 'chian',
  suggestion: 'chain',
};

const SENTENCE =
  'Há um código não reconhecido na observação privada da atividade de ' +
  'Bike A do dia 05/11/2026. “chian” — você quis dizer “chain”? ' +
  'Corrija no Strava para atualizar aqui no GearLife.';

function makeAuthContext() {
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
  } as any;
}

function makeDashboard({
  unrecognizedCodes,
  gearStats = [
    {
      id: 'bike-1',
      name: 'Bike A',
      activityType: 'Ride',
      count: 1,
      distance: 1000,
      movingTime: 100,
      equipments: [
        {
          id: 'chain',
          caption: 'corrente:',
          show: 'Corrente',
          distance: 1000,
          movingTime: 100,
        },
      ],
    },
  ],
  hasGear = true,
  hasActivities = true,
}: {
  unrecognizedCodes?: BannerCode[];
  gearStats?: unknown[];
  hasGear?: boolean;
  hasActivities?: boolean;
}) {
  return {
    athlete: { id: 1 } as any,
    athleteStats: {} as any,
    hasGear,
    hasActivities,
    gearStats,
    equipmentThresholds: {},
    unrecognizedCodes,
  } as any;
}

function mockDashboard(dashboard: any) {
  vi.mocked(useAutoSyncModule.useAutoSync).mockReturnValue({
    dashboard,
    isLoading: false,
    isError: null,
    mutate: vi.fn(),
  } as any);
}

async function renderStats(container: HTMLElement, root: ReturnType<typeof createRoot>) {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={makeAuthContext()}>
        <Stats />
      </AuthContext.Provider>,
    );
    await Promise.resolve();
  });
  return container;
}

function findCloseButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector(
    'button[aria-label="Dispensar aviso de código não reconhecido"]',
  );
  expect(button).not.toBeNull();
  return button as HTMLButtonElement;
}

describe('Stats D14 — banner de código não reconhecido', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('renders the exact copy with the date linked (target/rel) and warning class', async () => {
    mockDashboard(makeDashboard({ unrecognizedCodes: [CODE] }));

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(container, root);

    expect(container.textContent).toContain(SENTENCE);

    const banner = container.querySelector('[class*="codesWarningBanner"]');
    expect(banner).not.toBeNull();

    const link = container.querySelector('a[href*="strava.com/activities/42"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('target')).toBe('_blank');
    expect(link!.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link!.textContent).toBe('05/11/2026');

    expect(
      container.querySelector('[role="status"][aria-live="polite"]'),
    ).not.toBeNull();
    findCloseButton(container);

    act(() => {
      root.unmount();
    });
  });

  it('hides every visible case when ✕ is pressed', async () => {
    mockDashboard(
      makeDashboard({
        unrecognizedCodes: [CODE, { ...CODE, activityId: 43, word: 'reviw', suggestion: 'review' }],
      }),
    );

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(container, root);

    expect(container.textContent).toContain('“chian”');

    await act(async () => {
      findCloseButton(container).click();
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain('Há um código não reconhecido');
    expect(
      container.querySelector('button[aria-label="Dispensar aviso de código não reconhecido"]'),
    ).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it('shows the cases again after a remount (dispensa é só da sessão)', async () => {
    mockDashboard(makeDashboard({ unrecognizedCodes: [CODE] }));

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(container, root);

    await act(async () => {
      findCloseButton(container).click();
      await Promise.resolve();
    });
    expect(container.textContent).not.toContain('Há um código não reconhecido');

    act(() => {
      root.unmount();
    });

    const freshContainer = document.createElement('div');
    const freshRoot = createRoot(freshContainer);
    await renderStats(freshContainer, freshRoot);

    expect(freshContainer.textContent).toContain(SENTENCE);

    act(() => {
      freshRoot.unmount();
    });
  });

  it('reopens only for a new case (dismissed rows stay hidden)', async () => {
    mockDashboard(makeDashboard({ unrecognizedCodes: [CODE] }));

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(container, root);

    await act(async () => {
      findCloseButton(container).click();
      await Promise.resolve();
    });

    const newCode: BannerCode = {
      ...CODE,
      activityId: 43,
      word: 'reviw',
      suggestion: 'review',
    };
    mockDashboard(makeDashboard({ unrecognizedCodes: [CODE, newCode] }));
    await renderStats(container, root);

    expect(container.textContent).toContain(
      'Há um código não reconhecido na observação privada da atividade de ' +
        'Bike A do dia 05/11/2026. “reviw” — você quis dizer “review”? ' +
        'Corrija no Strava para atualizar aqui no GearLife.',
    );
    expect(container.textContent).not.toContain('“chian”');

    act(() => {
      root.unmount();
    });
  });

  it('does not reopen after a gear rename (mesma identidade activityId:word)', async () => {
    mockDashboard(makeDashboard({ unrecognizedCodes: [CODE] }));

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(container, root);

    await act(async () => {
      findCloseButton(container).click();
      await Promise.resolve();
    });

    mockDashboard(
      makeDashboard({
        unrecognizedCodes: [{ ...CODE, gearName: 'Bike Renomeada' }],
      }),
    );
    await renderStats(container, root);

    expect(container.textContent).not.toContain('Há um código não reconhecido');

    act(() => {
      root.unmount();
    });
  });

  it('renders even when gearStats is empty (não há cards registrados)', async () => {
    mockDashboard(
      makeDashboard({ gearStats: [], unrecognizedCodes: [CODE] }),
    );

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(container, root);

    expect(container.textContent).toContain(SENTENCE);

    act(() => {
      root.unmount();
    });
  });

  it('renders nothing when there are no cases', async () => {
    mockDashboard(makeDashboard({ unrecognizedCodes: undefined }));

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(container, root);

    expect(container.textContent).not.toContain('Há um código não reconhecido');
    expect(
      container.querySelector('button[aria-label="Dispensar aviso de código não reconhecido"]'),
    ).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it('paints from the sessionStorage cache on the first render', async () => {
    sessionStorage.setItem('athleteCacheTime', Date.now().toString());
    sessionStorage.setItem('athlete', JSON.stringify({ id: 1 }));
    sessionStorage.setItem('athleteStats', JSON.stringify({}));
    sessionStorage.setItem('gearStats', JSON.stringify([]));
    sessionStorage.setItem('hasGear', 'true');
    sessionStorage.setItem('hasActivities', 'true');
    sessionStorage.setItem('unrecognizedCodes', JSON.stringify([CODE]));

    mockDashboard(null);

    const container = document.createElement('div');
    const root = createRoot(container);
    await renderStats(container, root);

    expect(container.textContent).toContain(SENTENCE);

    act(() => {
      root.unmount();
    });
  });
});
