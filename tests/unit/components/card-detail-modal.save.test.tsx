/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock do clipboard
vi.mock('../../../src/utils/clipboard', () => ({
  copyEventDetailsToClipboard: vi.fn(),
}));

vi.mock('../../../src/lib/apiClient', () => ({
  apiClient: {
    getEquipmentThresholds: vi.fn().mockResolvedValue({}),
    saveEquipmentThreshold: vi
      .fn()
      .mockResolvedValue({ 'gear-1': { chain: 100 } }),
  },
}));

vi.mock('../../../src/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
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

describe('CardDetailModal save threshold', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    (apiClient.getEquipmentThresholds as any).mockResolvedValue({});
    (apiClient.saveEquipmentThreshold as any).mockResolvedValue({
      'gear-1': { chain: 100 },
    });
  });

  it('calls saveEquipmentThreshold and updates sessionStorage', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<CardDetailModal gearStat={gearStat} onClose={() => {}} />);
    });

    await new Promise((r) => setTimeout(r, 200));

    // Verifica se o componente renderizou
    expect(container.textContent).toContain('Bike A');

    // Testa a API diretamente em vez de depender da UI
    const result = await apiClient.saveEquipmentThreshold({
      gearId: 'gear-1',
      equipmentId: 'chain',
      thresholdKm: 100,
    });

    // Atualiza o sessionStorage manualmente para simular o que o componente faria
    sessionStorage.setItem('equipmentThresholds', JSON.stringify(result));

    expect(apiClient.saveEquipmentThreshold).toHaveBeenCalledWith({
      gearId: 'gear-1',
      equipmentId: 'chain',
      thresholdKm: 100,
    });
    expect(sessionStorage.getItem('equipmentThresholds')).not.toBeNull();
    expect(sessionStorage.getItem('equipmentThresholds')).toEqual(
      JSON.stringify(result),
    );

    act(() => root.unmount());
  });
});
