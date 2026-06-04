/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../src/lib/apiClient', () => ({
  apiClient: {
    getEquipmentThresholds: vi.fn().mockResolvedValue({}),
    saveEquipmentThreshold: vi.fn().mockResolvedValue({}),
  },
}));

import CardDetailModal from '../../../src/components/CardDetailModal';
import { ToastProvider } from '../../../src/contexts/ToastContext';
import { apiClient } from '../../../src/lib/apiClient';

const gearStat = {
  id: 'gear-1',
  name: 'Bike A',
  // activityType must end with 'Ride' for isBikeActivityType()
  activityType: 'RoadRide',
  count: 10,
  distance: 100000,
  movingTime: 3600,
  equipments: [
    {
      id: 'chain',
      caption: 'Corrente',
      date: '2020-01-01T00:00:00Z',
      distance: 5000,
      movingTime: 100,
    },
  ],
} as any;

describe('CardDetailModal save threshold', () => {
  beforeEach(() => {
    sessionStorage.clear();
    (apiClient.getEquipmentThresholds as any).mockResolvedValue({});
    (apiClient.saveEquipmentThreshold as any).mockResolvedValue({
      gear1: { chain: 10 },
    });
  });

  it('calls saveEquipmentThreshold and updates sessionStorage', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ToastProvider>
          <CardDetailModal gearStat={gearStat} onClose={() => {}} />
        </ToastProvider>,
      );
    });

    // wait for async effect to populate thresholds
    await new Promise((r) => setTimeout(r, 50));
    // (dom inspected during debugging; input should be present)
    const input = container.querySelector('input') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    // enter value and click save
    await act(async () => {
      input!.value = '10';
      input!.dispatchEvent(new Event('input', { bubbles: true }));
      const btn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Salvar',
      ) as HTMLButtonElement;
      btn.click();
    });

    expect(apiClient.saveEquipmentThreshold as any).toHaveBeenCalled();
    // sessionStorage should be updated
    expect(sessionStorage.getItem('equipmentThresholds')).not.toBeNull();

    act(() => root.unmount());
  });
});
