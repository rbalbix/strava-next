# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Install `swr` and implement `useAutoSync` hook for dashboard polling.
- Achieve 100% coverage for the hook.

## Important Decisions
- Used `swr@2.4.1`.
- Configured `refreshInterval` default to 5000ms.
- Enabled `revalidateOnFocus` and `revalidateOnReconnect`.
- Included `dedupingInterval: 0` in test wrapper to ensure polling triggers as expected during testing with fake timers.

## Learnings
- Test files containing JSX/TSX must use the `.tsx` extension for proper transformation by Vitest/Esbuild.
- SWR 2.x `isLoading` properly handles the initial loading state (no data, no error).

## Files / Surfaces
- `package.json`: Added `swr`.
- `src/hooks/useAutoSync.ts`: New hook implementation.
- `tests/unit/hooks/useAutoSync.test.tsx`: Unit tests.

## Errors / Corrections
- Fixed `Transform failed` error by renaming `tests/unit/hooks/useAutoSync.test.ts` to `.tsx`.
- Adjusted polling test to use `vi.advanceTimersByTimeAsync` and `waitFor` to correctly handle async fetches during polling.

## Ready for Next Run
- Task 01 is complete. Task 02 can proceed to integrate the hook into `Stats.tsx`.
