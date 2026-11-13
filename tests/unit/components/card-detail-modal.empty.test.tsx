/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { openModalMock, signOutMock } = vi.hoisted(() => ({
  openModalMock: vi.fn(),
  signOutMock: vi.fn(),
}));

// Mantém os utilitários reais do módulo (ApiError/getHttpStatus) — o modal
// decide o caminho do 401 por eles — e só substitui o cliente.
vi.mock('../../../src/lib/apiClient', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return {
    ...mod,
    apiClient: {
      getEquipmentThresholds: vi.fn().mockResolvedValue({}),
      saveEquipmentThreshold: vi.fn(),
    },
  };
});

vi.mock('../../../src/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import CardDetailModal from '../../../src/components/CardDetailModal';
import { AuthContext } from '../../../src/contexts/AuthContext';

const EMPTY_STATE_TEXT =
  'Você ainda não registrou manutenção para nenhum componente da sua bike';
const NO_ACTIVITIES_TEXT = 'Não há atividades registradas no Strava.';

function makeGearStat(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gear-1',
    name: 'Bike A',
    activityType: 'RoadRide',
    count: 10,
    distance: 100000,
    movingTime: 3600,
    equipments: [
      {
        id: 'chain',
        caption: 'corrente:',
        date: new Date().toISOString(),
        distance: 50000,
        movingTime: 1800,
      },
    ],
    ...overrides,
  } as any;
}

async function mountModal(gearStat: ReturnType<typeof makeGearStat>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <AuthContext.Provider
        value={{ signOut: signOutMock, openModal: openModalMock } as any}
      >
        <CardDetailModal gearStat={gearStat} onClose={() => {}} />
      </AuthContext.Provider>,
    );
  });
  // Flush da carga mockada de limites (GET ao montar).
  await act(async () => {});

  return { container, root };
}

function unmount(root: ReturnType<typeof createRoot>, container: HTMLElement) {
  act(() => root.unmount());
  container.remove();
}

describe('CardDetailModal — empty state (D2)', () => {
  beforeEach(() => {
    openModalMock.mockClear();
    signOutMock.mockClear();
  });

  it('bike sem componentes registrados mostra a mensagem e abre o passo a passo', async () => {
    const { container, root } = await mountModal(
      makeGearStat({ equipments: [] }),
    );

    expect(container.textContent).toContain(EMPTY_STATE_TEXT);

    const button = Array.from(container.querySelectorAll('button')).find(
      (el) => el.textContent === 'Ver como funciona',
    );
    expect(button).toBeDefined();

    act(() => {
      fireEvent.click(button as HTMLButtonElement);
    });
    expect(openModalMock).toHaveBeenCalledTimes(1);
    expect(openModalMock).toHaveBeenCalledWith('info');

    unmount(root, container);
  });

  it('bike com componentes registrados não mostra o empty state', async () => {
    const { container, root } = await mountModal(makeGearStat());

    expect(container.textContent).not.toContain(EMPTY_STATE_TEXT);
    expect(container.textContent).toContain('corrente:');

    unmount(root, container);
  });

  it('gear que não é bike não mostra a mensagem (ela fala "da sua bike")', async () => {
    const { container, root } = await mountModal(
      makeGearStat({ activityType: 'Run', equipments: [] }),
    );

    expect(container.textContent).not.toContain(EMPTY_STATE_TEXT);

    unmount(root, container);
  });

  it('gear sem atividades mostra a mensagem D15 e o botão, sem a de manutenção', async () => {
    const { container, root } = await mountModal(
      makeGearStat({
        activityType: null,
        count: 0,
        distance: 0,
        movingTime: 0,
        equipments: [],
      }),
    );

    expect(container.textContent).toContain(NO_ACTIVITIES_TEXT);
    // sem atividades, a mensagem de manutenção do D2 não cabe
    expect(container.textContent).not.toContain(EMPTY_STATE_TEXT);
    // stats zerados seguem no header, como nos demais cards
    expect(container.textContent).toContain('0,00km');
    // sem tipo associado → ícone de bike Road
    expect(container.querySelector('[data-testid="icon-bike"]')).toBeTruthy();

    const button = Array.from(container.querySelectorAll('button')).find(
      (el) => el.textContent === 'Ver como funciona',
    );
    expect(button).toBeDefined();

    act(() => {
      fireEvent.click(button as HTMLButtonElement);
    });
    expect(openModalMock).toHaveBeenCalledWith('info');

    unmount(root, container);
  });
});
