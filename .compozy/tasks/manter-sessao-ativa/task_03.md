---
status: completed
title: Implement Server-Side Page Pre-Flight Redirection
type: frontend
complexity: low
dependencies:
  - task_01
---

## Overview
This task ensures that users with missing or expired sessions are intercepted before the user interface mounts on the client browser. It adds pre-flight checking inside the homepage server-side execution context to trigger immediate, seamless OAuth renewals.

<critical>
- Read the PRD and TechSpec before beginning work.
- Reference TechSpec sections by name where applicable.
- Focus on WHAT needs to be built rather than HOW to build it.
- Keep changes minimal and focused on the task at hand.
- Automated tests are required for all deliverables.
</critical>

<requirements>
1. `getServerSideProps` in `src/pages/index.tsx` MUST perform a pre-flight evaluation of the active user session.
2. If `athlete_id` is missing or invalid, `getServerSideProps` MUST return an explicit Next.js redirection object.
3. The redirection destination MUST target `/api/oauth/start` with `permanent: false` to initiate the seamless renewal cycle.
</requirements>

## Subtasks
- [x] Update `getServerSideProps` inside `src/pages/index.tsx` to detect invalid sessions.
- [x] Construct the Next.js standard short-circuit redirection response structure.
- [x] Verify homepage rendering paths carry no flashes of unauthenticated views.

## Implementation Details
Incorporate server routing redirection maps inside Next.js page context pre-render functions.

### Relevant Files
- `src/pages/index.tsx`: Core landing page and application dashboard routing hub.

### Dependent Files
- `src/contexts/AuthContext.tsx`: Manages browser session lifecycle representations.

### Related ADRs
- [ADR-001: Sessão Longa Ininterrupta com Renovação Transparente](adrs/adr-001.md)
- [ADR-002: Server-Side Authentication Wrapper and Cookie Lifespan Centralization](adrs/adr-002.md)

## Deliverables
- Re-routed `src/pages/index.tsx` server context definition optimizing the automatic re-authentication pipeline.

## Tests
### Integration Tests
- Assert `getServerSideProps` returns a redirect descriptor pointing to `/api/oauth/start` when request headers lack authentication cookies.
- Assert `getServerSideProps` resolves normally returning full layout props when proper cookies are present.

## Success Criteria
- All tests passing.
- Test coverage >= 80%.
- Unauthenticated entry directly into the main page transparently pushes the navigation stack to the OAuth entry loop.
