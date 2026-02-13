# Instruções do Copilot / Agente AI para strava-next

Propósito: fornecer ao agente AI o contexto mínimo e acionável para ser produtivo neste repositório.

- Tipo de projeto: Next.js + TypeScript — aplicação monorepo com rotas API (server-side) que integra com a API do Strava.
- Runtime: Node.js (>=16). Inicie localmente com `npm run dev` ou `yarn dev` (ver `Readme.md`).

Visão geral (o que revisar primeiro)

- Frontend: `src/pages/*` e `src/components/*` — UI React/Next padrão.
- API server-side: `src/pages/api/*` contém fluxos de OAuth (`authorize.tsx`), persistência de tokens (`save-tokens.ts`) e webhook (`webhook.ts`). Considere esses arquivos como a lógica servidor "canônica".
- Camada de serviços: `src/services/*` concentra integrações e lógica de negócio. Arquivos importantes:
  - `src/services/strava-auth.ts` — leitura/gravação de tokens, refresh de token (usa chaves de Redis definidas em `config`).
  - `src/services/api.ts` — instâncias axios pré-configuradas (`apiStravaOauthToken`, `apiStravaAuth`, `apiRemoteStorage`) com header `X-Request-ID` para tracing.
  - `src/services/redis.ts` — inicializa Upstash Redis via `Redis.fromEnv()`; uso restrito ao servidor.
  - `src/services/activity.ts`, `athlete.ts`, `gear.ts`, `statistics.ts` — processamento de atividades e geração de estatísticas (chamados pelo webhook).

Fluxos críticos & pontos de integração

- OAuth: fluxo completo em `src/pages/api/authorize.tsx` — troca `code` por tokens via `apiStravaOauthToken`, seta cookies e POSTa para `apiStravaAuth`/`save-tokens` (que persiste em Redis).
- Gestão de tokens: `getAthleteAccessToken(athleteId)` lê `REDIS_KEYS.auth(athleteId)`, verifica expiração e chama `refreshStravaToken()` quando necessário.
- Webhook: `src/pages/api/webhook.ts` valida `VERIFY_TOKEN`, processa eventos (`activity` / `athlete`), recupera token com `getAthleteAccessToken()`, cria cliente `Strava` e chama serviços de processamento/estatísticas. Falhas disparam `sendEmail()` onde aplicável.
- Chamadas externas: todas as chamadas externas usam clientes em `src/services/api.ts` — altere ou adicione clientes lá para manter headers e timeouts consistentes.

Ambiente & segredos (o que configurar)

- Variáveis necessárias: `CLIENT_ID`, `CLIENT_SECRET`, `GRANT_TYPE`, `VERIFY_TOKEN`, `NEXT_PUBLIC_CONTACT_EMAIL`, `RESEND_EMAIL_FROM`. Veja `Readme.md` para instruções locais.
- Redis: em desenvolvimento o Redis é criado por `Redis.fromEnv()` — defina `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` ou aponte para um Redis compatível.
- Não codifique segredos em código; use `.env.local` e não comite essas variáveis.

Convenções e padrões do projeto

- Cliente HTTP centralizado: estenda `src/services/api.ts` para novos endpoints externos — isso garante `timeout`, `Content-Type` e `X-Request-ID` padronizados.
- Chaves Redis: use `REDIS_KEYS` do `config` para evitar colisões; `saveStravaAuth()` persiste tokens com `redis.setex` por 90 dias.
- Tratamento de erros: rotas server-side geralmente usam `console.error` e notificam por email via `src/services/email.ts` em falhas inesperadas — siga esse padrão.
- Código server-only: qualquer arquivo em `src/pages/api/*` ou que importe `src/services/redis.ts` é destinado ao runtime do servidor — não mova acesso a Redis para o cliente.

Exemplos práticos

- Refresh de token: chame `getAthleteAccessToken(athleteId)` de `webhook` ou jobs para garantir `accessToken` válido (veja `src/services/strava-auth.ts`).
- Novo cliente externo: registre no `src/services/api.ts` e importe onde necessário para herdar headers/timeouts.

Ao editar / adicionar código

- Prefira patches pequenos e focados que preservem padrões existentes (clientes axios, `REDIS_KEYS`, fallback de email nas falhas).
- Para mudanças em API, atualize a rota correspondente em `src/pages/api/*` e mantenha os segredos no servidor.
- Valide localmente com:

```bash
npm run dev
# ou
yarn dev
```

Para testar webhooks, replique requisições POST do Strava e defina `VERIFY_TOKEN` corretamente.

Arquivos para referência rápida

- `Readme.md`
- OAuth: `src/pages/api/authorize.tsx`
- Tokens: `src/services/strava-auth.ts`
- Webhook: `src/pages/api/webhook.ts` e `src/services/activity.ts`
- Clientes HTTP: `src/services/api.ts`
- Redis: `src/services/redis.ts`

Se alguma seção ficou ambígua ou você quer exemplos concretos (payloads de webhook, snippets de teste, ou passos de CI), diga qual área deseja ampliar.
