/* @vitest-environment jsdom */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import CardItem from '../../../src/components/CardItem';
import { ToastProvider } from '../../../src/contexts/ToastContext';

const equipment = {
  id: 'chain',
  caption: 'Corrente',
  date: '2020-01-01T00:00:00Z',
  distance: 5000,
  movingTime: 100,
};

describe('CardItem progress bar', () => {
  it('renders progress fill with correct width for threshold', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(
        <ToastProvider>
          <ul>
            <CardItem
              equipment={equipment as any}
              distance={100000}
              movingTime={1000}
              thresholdKm={10}
            />
          </ul>
        </ToastProvider>,
      );
    });

    // find element with inline style width
    const fill = container.querySelector('div[style]') as HTMLDivElement | null;
    expect(fill).not.toBeNull();
    expect(fill!.style.width).toBe('50%');

    act(() => root.unmount());
  });
});
