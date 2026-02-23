````instructions
---
applyTo: '**'
---

# Copilot / AI Agent Instructions for strava-next

Purpose: provide the AI agent with the minimal, actionable context required to be productive in this repository.

- Project type: Next.js + TypeScript — monorepo application with API routes (server-side) integrating with the Strava API.
- Runtime: Node.js (>=16). Start locally with `npm run dev` or `yarn dev` (see `Readme.md`).

Overview (what to review first)

- Frontend: `src/pages/*` and `src/components/*` — standard React/Next UI.
- Server-side API: `src/pages/api/*` contains OAuth flows (`authorize.tsx`), token persistence (`save-tokens.ts`) and webhook (`webhook.ts`). Treat these files as canonical server logic.
- Services layer: `src/services/*` concentrates integrations and business logic. Key files:
  - `src/services/strava-auth.ts` — read/write tokens, refresh tokens (uses Redis keys defined in `config`).
  - `src/services/api.ts` — pre-configured axios instances (`apiStravaOauthToken`, `apiStravaAuth`, `apiRemoteStorage`) with `X-Request-ID` header for tracing.
  - `src/services/redis.ts` — initializes Upstash Redis via `Redis.fromEnv()`; server-only usage.
  - `src/services/activity.ts`, `athlete.ts`, `gear.ts`, `statistics.ts` — activity processing and statistics generation (invoked by the webhook).

Critical flows & integration points

- OAuth: full flow lives in `src/pages/api/authorize.tsx` — exchange `code` for tokens via `apiStravaOauthToken`, set cookies and POST to `apiStravaAuth`/`save-tokens` (which persists to Redis).
- Token management: `getAthleteAccessToken(athleteId)` reads `REDIS_KEYS.auth(athleteId)`, checks expiration and calls `refreshStravaToken()` when needed.
- Webhook: `src/pages/api/webhook.ts` validates `VERIFY_TOKEN`, processes events (`activity` / `athlete`), retrieves token with `getAthleteAccessToken()`, creates a `Strava` client and calls processing/statistics services. Failures trigger `sendEmail()` where applicable.
- External calls: all external HTTP calls use clients defined in `src/services/api.ts` — extend or add clients there to inherit standard headers and timeouts.

Environment & secrets (what to configure)

- Required env vars: `CLIENT_ID`, `CLIENT_SECRET`, `GRANT_TYPE`, `VERIFY_TOKEN`, `NEXT_PUBLIC_CONTACT_EMAIL`, `RESEND_EMAIL_FROM`. See `Readme.md` for local setup instructions.
- Redis: in development Redis is created with `Redis.fromEnv()` — set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` or point to a compatible Redis instance.
- Do not hardcode secrets in source; use `.env.local` and do not commit those files.

Conventions and patterns

- Central HTTP client: register new external endpoints in `src/services/api.ts` so they inherit `timeout`, `Content-Type` and `X-Request-ID`.
- Redis keys: use `REDIS_KEYS` from `config` to avoid collisions; `saveStravaAuth()` persists tokens using `redis.setex` for 90 days.
- Error handling: server routes typically use `console.error` and notify by email via `src/services/email.ts` on unexpected failures — follow this pattern.
- Server-only code: any file under `src/pages/api/*` or importing `src/services/redis.ts` is intended to run on the server — do not move Redis access to client code.

Practical examples

- Token refresh: call `getAthleteAccessToken(athleteId)` from the webhook or background jobs to ensure a valid `accessToken` (see `src/services/strava-auth.ts`).
- New external client: register it in `src/services/api.ts` and import where needed to inherit headers and timeouts.

When editing / adding code

- Prefer small, focused patches that preserve existing patterns (axios clients, `REDIS_KEYS`, email fallback on failures).
- For API changes, update the corresponding route under `src/pages/api/*` and keep secrets on the server.
- Validate locally with:

```bash
npm run dev
# or
yarn dev
````

To test webhooks, replay Strava POST requests and set `VERIFY_TOKEN` accordingly.

Quick reference files

- `Readme.md`
- OAuth: `src/pages/api/authorize.tsx`
- Tokens: `src/services/strava-auth.ts`
- Webhook: `src/pages/api/webhook.ts` and `src/services/activity.ts`
- HTTP clients: `src/services/api.ts`
- Redis: `src/services/redis.ts`

If any section is ambiguous or you want concrete examples (webhook payloads, test snippets, or CI steps), specify which area to expand.

```

```
