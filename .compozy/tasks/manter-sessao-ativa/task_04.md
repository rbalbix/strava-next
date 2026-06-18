---
status: completed
title: Automation Testing Coverage & Verification
type: test
complexity: medium
dependencies:
  - task_02
  - task_03
---

## Overview
This task builds a robust suite of automated tests guarding the session maintenance features. It connects unit validations and server-side request simulation suites to prevent auth regressions.

<critical>
- Read the PRD and TechSpec before beginning work.
- Reference TechSpec sections by name where applicable.
- Focus on WHAT needs to be built rather than HOW to build it.
- Keep changes minimal and focused on the task at hand.
- Automated tests are required for all deliverables.
</critical>

<requirements>
1. Comprehensive automated tests MUST cover the constants, API wrappers, and server props.
2. Mocks used for `NextApiRequest` and `NextApiResponse` MUST mimic standard cookie structures accurately.
3. Test files MUST execute flawlessly on the local test runner (`vitest`).
</requirements>

## Subtasks
- [ ] Write unit assertions for configuration constants.
- [ ] Write request simulation suites for `withProtectedAPI` middleware handler.
- [ ] Validate server context responses emitted by page loaders.

## Implementation Details
Create detailed software verification configurations mapping happy paths and edge cases.

### Relevant Files
- `tests/unit/auth.test.ts` or relevant existing unit test suites.
- `tests/integration/session.test.ts` or corresponding test files.

### Dependent Files
- `vitest.config.mjs`: Central testing orchestrator profile.

### Related ADRs
- [ADR-002: Server-Side Authentication Wrapper and Cookie Lifespan Centralization](adrs/adr-002.md)

## Deliverables
- Comprehensive unit and integration test specs verifying cookie lifespan calculations, middleware interceptor blocks, and page redirects.

## Tests
### Unit Tests
- Assert 30-day cookie evaluation expressions.
- Assert middleware handler intercepts invalid access tokens with 401 JSON blocks.
### Integration Tests
- Simulate full server page context load and inspect redirection metadata payloads.

## Success Criteria
- All automated tests run and pass cleanly.
- Test coverage >= 80% across modified codebase layers.
- Codebase builds and lints with zero errors or warnings.
