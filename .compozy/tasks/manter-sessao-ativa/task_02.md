---
status: pending
title: Implement API Protection Middleware Wrapper
type: backend
complexity: medium
dependencies:
  - task_01
---

## Overview
This task creates a robust, server-side authentication abstraction layer for API routes. It implements a higher-order middleware function that extracts user identity from incoming headers or cookies, handles authorization rejections cleanly, and wraps protected backend endpoints.

<critical>
- Read the PRD and TechSpec before beginning work.
- Reference TechSpec sections by name where applicable.
- Focus on WHAT needs to be built rather than HOW to build it.
- Keep changes minimal and focused on the task at hand.
- Automated tests are required for all deliverables.
</critical>

<requirements>
1. A higher-order function `withProtectedAPI` MUST be implemented in `src/server/auth.ts`.
2. The wrapper MUST invoke `getAuthenticatedAthleteId(req)` to validate session tokens.
3. If the athlete ID is missing or invalid, the wrapper MUST return a `401 Unauthorized` status with a structured JSON payload (`{ error: 'Unauthorized', reason: '...' }`).
4. Wrapped endpoints MUST receive the valid `athleteId` forwarded as an explicit argument.
5. All sensitive application endpoints under `src/pages/api/app/*` and `src/pages/api/dashboard.ts` MUST be refactored to use this wrapper.
</requirements>

## Subtasks
- [x] Define the `AuthenticatedNextApiHandler` type signature matching the Core Interfaces section of the TechSpec.
- [x] Build the `withProtectedAPI` wrapper function inside the server auth layer.
- [x] Apply `withProtectedAPI` to wrap `src/pages/api/dashboard.ts`.
- [x] Apply `withProtectedAPI` to wrap `src/pages/api/app/equipment-thresholds.ts`.

## Implementation Details
Introduce a re-usable functional wrapper to intercept incoming request contexts before reaching business logic handlers.

### Relevant Files
- `src/server/auth.ts`: Central authorization utility script where the wrapper code will be added.
- `src/pages/api/dashboard.ts`: High-traffic backend API that serves main user stats.
- `src/pages/api/app/equipment-thresholds.ts`: Configuration API route for equipment rules.

### Dependent Files
- `src/components/Stats.tsx`: Front-end consumer of the dashboard API endpoints.

### Related ADRs
- [ADR-002: Server-Side Authentication Wrapper and Cookie Lifespan Centralization](adrs/adr-002.md)

## Deliverables
- `withProtectedAPI` abstraction helper exported from server security modules.
- Refactored, uniform, clean backend API routes protected by the middleware handler.

## Tests
### Unit Tests
- Assert `withProtectedAPI` responds with status `401` when requests carry empty or corrupt cookies.
- Assert `withProtectedAPI` executes the inner handler successfully when given valid authentication identifiers.

## Success Criteria
- All tests passing.
- Test coverage >= 80%.
- Unauthenticated access attempts to dashboard or thresholds APIs yield immediate JSON 401s.
.
