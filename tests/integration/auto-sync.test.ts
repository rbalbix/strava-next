/* @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { useAutoSync } from '../../src/hooks/useAutoSync';
import { SWRConfig } from 'swr';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => {
    server.resetHandlers();
    vi.useRealTimers();
});
afterAll(() => server.close());

describe('useAutoSync', () => {
    it('polls at the configured interval', async () => {
        let callCount = 0;
        server.use(
            http.get('/api/app/dashboard', () => {
                callCount++;
                return HttpResponse.json({ 
                    athlete: { id: callCount }, 
                    athleteStats: {}, 
                    hasGear: true, 
                    hasActivities: true, 
                    gearStats: [] 
                });
            })
        );

        const { result } = renderHook(() => useAutoSync(50), {
            wrapper: ({ children }) => React.createElement(SWRConfig, { value: { provider: () => new Map(), dedupingInterval: 0 } }, children)
        });

        // Initial fetch
        await waitFor(() => expect(result.current.dashboard?.athlete.id).toBeGreaterThan(0), { timeout: 2000 });
        const firstId = result.current.dashboard!.athlete.id;
        
        // Wait for next polling
        await waitFor(() => expect(result.current.dashboard?.athlete.id).toBeGreaterThan(firstId), { timeout: 2000 });
        expect(callCount).toBeGreaterThan(1);
    }, 5000);

    it('handles API errors gracefully', async () => {
        server.use(
            http.get('/api/app/dashboard', () => {
                return new HttpResponse(null, { status: 500 });
            })
        );

        const { result } = renderHook(() => useAutoSync(100), {
            wrapper: ({ children }) => React.createElement(SWRConfig, { value: { provider: () => new Map(), dedupingInterval: 0 } }, children)
        });

        await waitFor(() => expect(result.current.isError).toBeDefined(), { timeout: 2000 });
        expect(result.current.dashboard).toBeUndefined();
    });
});
