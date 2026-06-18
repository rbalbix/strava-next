# Technical Specification — Keep Session Active

## Executive Summary
This technical specification describes the architectural changes required to extend user session longevity to 30 days and provide automated transparent authentication renewal. The implementation fixes a short 5-minute hardcoded session lifespan across cookies and ensures that any authentication breakdown (expired cookie or revoked tokens) safely triggers a server-side redirect or clean API rejection.

**Primary Technical Trade-off:** By handling session invalidation gracefully via a server-side wrapper (`withProtectedAPI`), we add a slight routing overhead to backend endpoints but gain complete prevention against client-side redirect cascading race conditions triggered by parallel SWR fetching hooks.

## System Architecture
The updated session and authorization workflow isolates token verification into a centralized backend abstraction layer.

### Component Boundaries
1. **Config Layer (`src/config/index.ts`)**: Hosts central session age constants.
2. **Server Security Core (`src/server/auth.ts`)**: Implements `withProtectedAPI` middleware wrapper.
3. **API Routing Layer (`src/pages/api/*`)**: Protects endpoints by applying the wrapper.
4. **Page Pre-rendering (`src/pages/index.tsx`)**: Controls server-side pre-flight redirection.

## Data Models & Storage
No changes to database schemas or Redis keys. The application continues to leverage existing Redis token keys (`REDIS_KEYS.auth(athleteId)`).
We configure the cookie duration properties to persist locally in the client browser using standard HTTP fields.

## API Design
No new endpoints are created. Existing endpoints will receive a uniform rejection contract upon session expiration.

### Authentication Failure Payload
When a session is missing or invalid, wrapped API routes respond with:
* **Status Code:** `401 Unauthorized`
* **Content-Type:** `application/json`
```json
{
  "error": "Unauthorized",
  "reason": "Session expired or invalid"
}
```

## Core Interfaces
The primary type and middleware abstraction definition in the server layer:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

export type AuthenticatedNextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  athleteId: number
) => void | Promise<void>;

/**
 * Higher-Order Function to protect API routes requiring an authenticated Strava Athlete.
 */
export function withProtectedAPI(handler: AuthenticatedNextApiHandler);
```

## Monitoring & Performance
* **Session Lifetime:** Monitored using standard network cookies inspection.
* **Error Tracing:** Missing sessions or OAuth invalidation events will be logged using the project's existing logger framework (`getLogger`) with an appropriate `x-request-id` header context.

## Testing Strategy
1. **Unit Tests:**
   - Verify cookie duration calculations match `SESSION_MAX_AGE` constants.
   - Verify `withProtectedAPI` returns `401` when `strava_athleteId` cookie is absent.
   - Verify `withProtectedAPI` successfully forwards valid requests to the underlying handler with correct `athleteId`.
2. **Integration / Regression Tests:**
   - Mock invalid cookie scenarios in `getServerSideProps` for `src/pages/index.tsx` and assert correct Next.js redirect metadata payload is emitted.

## Development Sequencing
1. **Task 01: Centralize Configuration Constants**
   - Define `SESSION_MAX_AGE` in `src/config/index.ts`.
   - Update `src/pages/api/authorize.tsx` cookie serialization options to consume `SESSION_MAX_AGE`.
   - *Dependencies:* None.

2. **Task 02: Implement API Protection Middleware Wrapper**
   - Create `withProtectedAPI` Higher-Order Function inside `src/server/auth.ts`.
   - Refactor active application routes to use `withProtectedAPI`.
   - *Dependencies:* Task 01.

3. **Task 03: Page pre-flight redirection implementation**
   - Integrate cookie check and native server-side redirection inside `getServerSideProps` in `src/pages/index.tsx`.
   - *Dependencies:* Task 01.

4. **Task 04: Verification and Test Automation Coverage**
   - Write comprehensive unit and integration assertions ensuring session lifetimes and redirects function according to specification rules.
   - *Dependencies:* Task 02, Task 03.

## Architecture Decision Records
* [ADR-001: Sessão Longa Ininterrupta com Renovação Transparente](adrs/adr-001.md) — Establishes the product requirement of 30-day session lifespan with seamless user fallback loops.
* [ADR-002: Server-Side Authentication Wrapper and Cookie Lifespan Centralization](adrs/adr-002.md) — Documents the selection of server middleware wrappers and pre-flight page redirects over client-side interception.
