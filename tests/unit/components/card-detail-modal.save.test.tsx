/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { showToastMock } = vi.hoisted(() => ({ showToastMock: vi.fn() }));

// Mock do clipboard
vi.mock('../../../src/utils/clipboard', () => ({
  copyEventDetailsToClipboard: vi.fn(),
}));

vi.mock('../../../src/lib/apiClient', () => ({
  apiClient: {
    getEquipmentThresholds: vi.fn().mockResolvedValue({}),
    saveEquipmentThreshold: vi
      .fn()
      .mockResolvedValue({ 'gear-1': { chain: { value: 100, unit: 'km' } } }),
  },
}));

vi.mock('../../../src/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import CardDetailModal from '../../../src/components/CardDetailModal';
import { apiClient } from '../../../src/lib/apiClient';

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

type SavedThresholds = Record<
  string,
  Record<string, { value: number; unit: 'km' | 'h' }>
>;

async function mountModal(thresholds: SavedThresholds = {}) {
  (apiClient.getEquipmentThresholds as any).mockResolvedValue(thresholds);

  // Anexa ao document: sem isso o jsdom ignora .focus() e o rastreio de foco
  // não é exercitável nos testes.
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<CardDetailModal gearStat={gearStat} onClose={() => {}} />);
  });
  // Flush das promises mockadas (GET do editor) sem espera de relógio.
  await act(async () => {});

  return { container, root };
}

function unmount(root: ReturnType<typeof createRoot>, container: HTMLElement) {
  act(() => root.unmount());
  container.remove();
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

function getValueInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>(
    'input[type="number"]',
  );
  expect(input).not.toBeNull();
  return input as HTMLInputElement;
}

function findRadio(container: HTMLElement, unit: 'km' | 'h') {
  const radio = Array.from(
    container.querySelectorAll('[role="radio"]'),
  ).find((el) => el.textContent === unit);
  expect(radio).not.toBeNull();
  return radio as HTMLButtonElement;
}

function findButton(container: HTMLElement, label: string) {
  const button = container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
  expect(button).not.toBeNull();
  return button as HTMLButtonElement;
}

function setValue(input: HTMLInputElement, value: string) {
  act(() => {
    fireEvent.input(input, { target: { value } });
  });
}

async function clickAndFlush(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
}

describe('CardDetailModal save threshold', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    showToastMock.mockClear();
    (apiClient.getEquipmentThresholds as any).mockResolvedValue({});
    (apiClient.saveEquipmentThreshold as any).mockResolvedValue({
      'gear-1': { chain: { value: 100, unit: 'km' } },
    });
  });

  it('pré-preenche valor e unidade de quilômetros ao abrir com limite salvo', async () => {
    const { container, root } = await mountModal({
      'gear-1': { chain: { value: 150, unit: 'km' } },
    });

    openEditor(container);

    const input = getValueInput(container);
    expect(input.value).toBe('150');
    expect(input.getAttribute('step')).toBe('100');
    expect(input.getAttribute('placeholder')).toBe('Limite');
    expect(findRadio(container, 'km').getAttribute('aria-checked')).toBe('true');
    expect(findRadio(container, 'h').getAttribute('aria-checked')).toBe('false');

    unmount(root, container);
  });

  it('abre sem limite com unidade de quilômetros e campo vazio', async () => {
    const { container, root } = await mountModal({});

    openEditor(container);

    const input = getValueInput(container);
    expect(input.value).toBe('');
    expect(findRadio(container, 'km').getAttribute('aria-checked')).toBe('true');
    expect(input.getAttribute('placeholder')).toBe('Limite');

    unmount(root, container);
  });

  it('trocar a unidade mantém o valor digitado e muda o passo', async () => {
    const { container, root } = await mountModal({});

    openEditor(container);

    const input = getValueInput(container);
    setValue(input, '150');
    expect(input.value).toBe('150');

    act(() => {
      fireEvent.click(findRadio(container, 'h'));
    });

    // O valor permanece no campo; ele passa a valer em horas (step 1).
    expect(input.value).toBe('150');
    expect(input.getAttribute('step')).toBe('1');
    expect(findRadio(container, 'h').getAttribute('aria-checked')).toBe('true');
    expect(findRadio(container, 'km').getAttribute('aria-checked')).toBe(
      'false',
    );

    act(() => {
      fireEvent.click(findRadio(container, 'km'));
    });

    // Voltar para km também preserva o valor e restaura o passo de 100.
    expect(input.value).toBe('150');
    expect(input.getAttribute('step')).toBe('100');
    expect(findRadio(container, 'km').getAttribute('aria-checked')).toBe(
      'true',
    );

    unmount(root, container);
  });

  it('salva o valor mantido na unidade escolhida após a troca', async () => {
    const { container, root } = await mountModal({});

    openEditor(container);

    setValue(getValueInput(container), '150');
    act(() => {
      fireEvent.click(findRadio(container, 'h'));
    });
    await clickAndFlush(findButton(container, 'Salvar limite'));

    // Sem edição após a troca, o número vale como limite em horas — a
    // unidade escolhida é a que sai na gravação.
    expect(apiClient.saveEquipmentThreshold).toHaveBeenCalledWith({
      gearId: 'gear-1',
      equipmentId: 'chain',
      thresholdKm: 150,
      unit: 'h',
    });

    unmount(root, container);
  });

  it('clicar no segmento de unidade já ativo mantém o valor digitado', async () => {
    const { container, root } = await mountModal({});

    openEditor(container);

    const input = getValueInput(container);
    setValue(input, '150');

    // km já é a unidade ativa ao abrir: o clique não troca nem limpa
    act(() => {
      fireEvent.click(findRadio(container, 'km'));
    });

    expect(input.value).toBe('150');
    expect(findRadio(container, 'km').getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(findRadio(container, 'h').getAttribute('aria-checked')).toBe(
      'false',
    );

    unmount(root, container);
  });

  it('dá ao input do limite um nome acessível próprio, não o dos segmentos', async () => {
    const { container, root } = await mountModal({});

    openEditor(container);

    // O <label> envolve o radiogroup; sem aria-label o nome seria "km h"
    expect(getValueInput(container).getAttribute('aria-label')).toBe(
      'Limite de Corrente',
    );

    unmount(root, container);
  });

  it('salva com a unidade de horas', async () => {
    const { container, root } = await mountModal({});

    openEditor(container);

    act(() => {
      fireEvent.click(findRadio(container, 'h'));
    });
    setValue(getValueInput(container), '50');
    await clickAndFlush(findButton(container, 'Salvar limite'));

    expect(apiClient.saveEquipmentThreshold).toHaveBeenCalledWith({
      gearId: 'gear-1',
      equipmentId: 'chain',
      thresholdKm: 50,
      unit: 'h',
    });

    unmount(root, container);
  });

  it('salva com a unidade de quilômetros', async () => {
    const { container, root } = await mountModal({});

    openEditor(container);

    setValue(getValueInput(container), '200');
    await clickAndFlush(findButton(container, 'Salvar limite'));

    expect(apiClient.saveEquipmentThreshold).toHaveBeenCalledWith({
      gearId: 'gear-1',
      equipmentId: 'chain',
      thresholdKm: 200,
      unit: 'km',
    });

    unmount(root, container);
  });

  it('salvar valor zero continua removendo o limite com toast de remoção', async () => {
    const { container, root } = await mountModal({});

    openEditor(container);

    await clickAndFlush(findButton(container, 'Salvar limite'));

    expect(apiClient.saveEquipmentThreshold).toHaveBeenCalledWith({
      gearId: 'gear-1',
      equipmentId: 'chain',
      thresholdKm: 0,
      unit: 'km',
    });
    expect(showToastMock).toHaveBeenCalledWith('Limite removido', 'success');

    unmount(root, container);
  });

  it('as setas alternam o segmento ativo e levam o foco junto', async () => {
    const { container, root } = await mountModal({});

    openEditor(container);

    const kmRadio = findRadio(container, 'km');
    const hRadio = findRadio(container, 'h');
    expect(kmRadio.getAttribute('tabindex')).toBe('0');
    expect(hRadio.getAttribute('tabindex')).toBe('-1');

    setValue(getValueInput(container), '150');

    act(() => {
      fireEvent.keyDown(kmRadio, { key: 'ArrowRight' });
    });

    expect(hRadio.getAttribute('aria-checked')).toBe('true');
    expect(hRadio.getAttribute('tabindex')).toBe('0');
    expect(kmRadio.getAttribute('aria-checked')).toBe('false');
    expect(document.activeElement).toBe(hRadio);
    // A alternância por seta também preserva o valor digitado no campo.
    expect(getValueInput(container).value).toBe('150');

    act(() => {
      fireEvent.keyDown(hRadio, { key: 'ArrowLeft' });
    });

    expect(kmRadio.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(kmRadio);
    expect(getValueInput(container).value).toBe('150');

    unmount(root, container);
  });

  it('mantém campo, seletor e botão na mesma linha do editor', async () => {
    const { container, root } = await mountModal({});

    openEditor(container);

    const rows = container.querySelectorAll('[class*="thresholdRow"]');
    expect(rows.length).toBe(1);

    const row = rows[0];
    // Os três elementos são filhos diretos da mesma linha flexível: o seletor
    // não abre uma linha nova nem ganha um contêiner próprio de altura.
    expect(row.children.length).toBe(3);
    expect(row.children[0].tagName).toBe('INPUT');
    expect(row.children[1].getAttribute('role')).toBe('radiogroup');
    // A classe é o gancho de estilo do seletor (task 08); sem ela o CSS
    // module não resolve e os segmentos herdam o visual do botão de salvar.
    expect(row.children[1].className).toContain('unitSelector');
    expect(row.children[1].getAttribute('aria-label')).toBe(
      'Unidade do limite',
    );
    expect(row.children[2].getAttribute('aria-label')).toBe('Salvar limite');
    expect(
      row.parentElement?.querySelectorAll('[class*="thresholdRow"]').length,
    ).toBe(1);

    unmount(root, container);
  });

  it('fluxo de abertura, edição e salvamento pela UI atualiza o cache', async () => {
    const { container, root } = await mountModal({});

    expect(container.textContent).toContain('Bike A');

    openEditor(container);
    setValue(getValueInput(container), '250');
    await clickAndFlush(findButton(container, 'Salvar limite'));

    expect(apiClient.saveEquipmentThreshold).toHaveBeenCalledWith({
      gearId: 'gear-1',
      equipmentId: 'chain',
      thresholdKm: 250,
      unit: 'km',
    });
    expect(JSON.parse(sessionStorage.getItem('equipmentThresholds')!)).toEqual({
      'gear-1': { chain: { value: 100, unit: 'km' } },
    });
    expect(showToastMock).toHaveBeenCalledWith('Limite salvo', 'success');
    // O editor fecha após salvar
    expect(container.querySelector('input[type="number"]')).toBeNull();

    unmount(root, container);
  });

  it('fecha o editor ao acionar o botão de edição novamente', async () => {
    const { container, root } = await mountModal();

    openEditor(container);
    expect(container.querySelector('input[type="number"]')).not.toBeNull();

    // Com o editor aberto o botão passa a se chamar "Fechar editor...".
    const closer = container.querySelector<HTMLButtonElement>(
      'button[aria-label^="Fechar editor"]',
    );
    expect(closer).not.toBeNull();
    act(() => {
      fireEvent.click(closer as HTMLButtonElement);
    });
    expect(container.querySelector('input[type="number"]')).toBeNull();

    unmount(root, container);
  });

  it('salva ao pressionar Enter no campo do limite', async () => {
    const { container, root } = await mountModal();

    openEditor(container);
    const input = getValueInput(container);
    setValue(input, '250');

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(apiClient.saveEquipmentThreshold).toHaveBeenCalledWith({
      gearId: 'gear-1',
      equipmentId: 'chain',
      thresholdKm: 250,
      unit: 'km',
    });
    expect(showToastMock).toHaveBeenCalledWith('Limite salvo', 'success');

    unmount(root, container);
  });

  it('mostra toast de erro quando a API recusa o salvamento', async () => {
    const { container, root } = await mountModal();
    (apiClient.saveEquipmentThreshold as any).mockRejectedValueOnce(
      new Error('boom'),
    );

    openEditor(container);
    setValue(getValueInput(container), '100');
    const save = findButton(container, 'Salvar limite');

    await act(async () => {
      fireEvent.click(save);
    });

    expect(showToastMock).toHaveBeenCalledWith('Falha ao salvar limite', 'error');
    expect(
      JSON.parse(sessionStorage.getItem('equipmentThresholds') ?? 'null'),
    ).toBeNull();

    unmount(root, container);
  });

  it('ignora teclas que não são de seta no seletor de unidade', async () => {
    const { container, root } = await mountModal();

    openEditor(container);
    const km = findRadio(container, 'km');
    expect(km.getAttribute('tabindex')).toBe('0');

    act(() => {
      fireEvent.keyDown(km, { key: 'a' });
    });

    expect(km.getAttribute('aria-checked')).toBe('true');
    expect(findRadio(container, 'h').getAttribute('aria-checked')).toBe('false');
    expect(getValueInput(container).value).toBe('');

    unmount(root, container);
  });
});
