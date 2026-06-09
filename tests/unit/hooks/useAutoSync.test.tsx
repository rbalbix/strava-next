/* @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutoSync } from '../../../src/hooks/useAutoSync';
import { apiClient } from '../../../src/lib/apiClient';
import { SWRConfig } from 'swr';
import React from 'react';

vi.mock('../../../src/lib/apiClient', () => ({
  apiClient: {
    getDashboard: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe('useAutoSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls apiClient.getDashboard on mount', async () => {
    const mockData = { athlete: { id: 1 } };
    vi.mocked(apiClient.getDashboard).mockResolvedValue(mockData as any);

    const { result } = renderHook(() => useAutoSync(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.dashboard).toEqual(mockData);
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(apiClient.getDashboard).toHaveBeenCalledTimes(1);
  });

  it('returns isError when API fails', async () => {
    vi.mocked(apiClient.getDashboard).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useAutoSync(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBeDefined();
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it('polls at the configured interval', async () => {
    vi.useFakeTimers();
    const mockData = { athlete: { id: 1 } };
    vi.mocked(apiClient.getDashboard).mockResolvedValue(mockData as any);

    renderHook(() => useAutoSync(1000), { wrapper });

    // Wait for the initial call to complete
    await vi.advanceTimersByTimeAsync(0);
    expect(apiClient.getDashboard).toHaveBeenCalledTimes(1);

    // Wait for 1000ms to trigger the first poll
    await vi.advanceTimersByTimeAsync(1000);
    expect(apiClient.getDashboard).toHaveBeenCalledTimes(2);

    // Wait for another 1000ms to trigger the second poll
    await vi.advanceTimersByTimeAsync(1000);
    expect(apiClient.getDashboard).toHaveBeenCalledTimes(3);
    
    vi.useRealTimers();
  });

  it('exposes mutate function from SWR', () => {
    vi.mocked(apiClient.getDashboard).mockResolvedValue({} as any);
    const { result } = renderHook(() => useAutoSync(), { wrapper });
    expect(typeof result.current.mutate).toBe('function');
  });
});
