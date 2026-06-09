# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Refactor `Stats.tsx` to automatically trigger maintenance alerts (`openThresholdAlert`) when new `overdue` equipment items are detected after a sync, avoiding repeated triggers for already-alerted items.

## Important Decisions
- Used `useRef<Set<string>>` (`alertedEquipmentIds`) to persist the state of equipment that has already triggered an alert across re-renders without causing re-renders itself.
- Refactored `useEffect` to compare current `overdue` items against `alertedEquipmentIds` and only trigger `openModal` for new items.
- Added cleanup logic to remove equipment from `alertedEquipmentIds` if they are no longer in `overdue` state, allowing for re-triggering if maintenance is performed and the equipment eventually becomes overdue again.

## Learnings
- Managing stateful side effects based on dynamic data (polling) requires explicit tracking of "what has already been processed" rather than just "current state" to satisfy UX requirements (no repetitive modals).

## Files / Surfaces
- `src/components/Stats.tsx`

## Errors / Corrections

## Ready for Next Run
- Task completed and verified.
