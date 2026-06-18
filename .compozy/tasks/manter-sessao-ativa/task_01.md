---
status: completed
title: Centralize Configuration Constants & Update Cookie Age
type: chore
complexity: low
dependencies: []
---

## Overview
This task centralizes the session duration constraint to improve code maintainability and expands the login cookie lifespan. It introduces a `SESSION_MAX_AGE` constant equal to 30 days and configures the token generation callback to issue long-lived session identifiers.

<critical>
- Read the PRD and TechSpec before beginning work.
- Reference TechSpec sections by name where applicable.
- Focus on WHAT needs to be built rather than HOW to build it.
- Keep changes minimal and focused on the task at hand.
- Automated tests are required for all deliverables.
</critical>

<requirements>
1. A constant named `SESSION_MAX_AGE` MUST be exported from `src/config/index.ts`.
2. The `SESSION_MAX_AGE` value MUST evaluate exactly to 30 days expressed in seconds (`2592000`).
3. `src/pages/api/authorize.tsx` MUST use `SESSION_MAX_AGE` for configuring the `maxAge` option of `strava_code` and `strava_athleteId` serialization.
</requirements>

## Subtasks
- [ ] Add and export `SESSION_MAX_AGE` constant in config.
- [ ] Import `SESSION_MAX_AGE` inside the authorize handler.
- [ ] Update cookie serialization expressions to use the centralized age configuration.

## Implementation Details
Modify configuration files and update cookie metadata in the main OAuth redirect callback route.

### Relevant Files
- `src/config/index.ts`: Application configuration registry where the new constant will reside.
- `src/pages/api/authorize.tsx`: Handles OAuth token responses and issues the session cookies.

### Dependent Files
- `src/server/cookies.ts`: Serializes cookie headers using the configured age structure.

### Related ADRs
- [ADR-001: Sessão Longa Ininterrupta com Renovação Transparente](adrs/adr-001.md)
- [ADR-002: Server-Side Authentication Wrapper and Cookie Lifespan Centralization](adrs/adr-002.md)

## Deliverables
- Updated `src/config/index.ts` containing the central configuration variable.
- Refactored cookie age definitions in `src/pages/api/authorize.tsx`.
- Test suite verifying accurate constant evaluation.

## Tests
### Unit Tests
- Assert that `SESSION_MAX_AGE` is exported and evaluates to `2592000`.
- Verify authorize endpoint sets cookies with max-age matching the 30-day definition.

## Success Criteria
- All tests passing.
- Test coverage >= 80%.
- Cookie headers emitted by `/api/authorize` carry an explicit Max-Age of 30 days.
