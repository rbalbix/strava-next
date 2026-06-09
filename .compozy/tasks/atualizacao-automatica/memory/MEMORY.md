# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State
- `swr@2.4.1` installed and configured.
- `useAutoSync` hook available for dashboard polling.

## Shared Decisions
- Standardized on `swr` for all polling/revalidation needs in this feature.
- Default polling interval set to 5000ms.

## Shared Learnings
- SWR 2.x `isLoading` should be used instead of manual `!data && !error` checks for cleaner code.
- Ensure test files using JSX have `.tsx` extension to avoid transformation errors.

## Open Risks

## Handoffs
- Task 01 finished. Task 02 will use `useAutoSync` in `Stats.tsx`.
