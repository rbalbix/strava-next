import useSWR from 'swr';
import { apiClient } from '../lib/apiClient';

/**
 * Hook to automatically synchronize dashboard data using polling.
 * 
 * @param intervalMs Polling interval in milliseconds. Defaults to 5000ms.
 * @returns Dashboard data, loading state, error state, and mutate function.
 */
export function useAutoSync(intervalMs = 5000) {
  const { data, error, mutate, isLoading } = useSWR('dashboard', apiClient.getDashboard, {
    refreshInterval: intervalMs,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  return {
    dashboard: data,
    isLoading,
    isError: error,
    mutate,
  };
}
