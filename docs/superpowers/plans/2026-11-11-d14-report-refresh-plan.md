# Plano — D14.1: auto-refresh do relatório de códigos não reconhecidos

> **Data:** 2026-11-11 · **Design:** `docs/superpowers/specs/2026-11-11-d14-report-refresh-design.md`
> (**aprovado pelo proprietário em 2026-11-11** — caminho B escolhido com "Pode fazer o recomendado").
> **Motivo:** teste real do D14 mostrou que editar só a observação privada no Strava não
> dispara webhook → o banner nunca some depois da correção.
> **Gate final:** `yarn validate` + `yarn lint:colors` + `yarn test:report`.
> **Nota:** o skill `superpowers:writing-plans` segue indisponível; plano escrito direto do
> design aprovado (mesma nota do plano D14).
> **Ciclo git:** o D14 segue **sem liberação** ("ainda não") — este trabalho entra no mesmo
> ciclo quando o proprietário liberar; perguntar ao final. `docs/plano-usabilidade-gearlife.md`
> nunca entra em commit (artefato local, `skip-worktree`).
> **Baseline de testes (pós-D14):** 62 arquivos / 441 testes; Lines **99,75%** /
> Functions **100%** / Branches **94,71%** — sem regressão.

## Passo 0 — Amenda pontual no design (transparência)

O design aprovado diz "zero leitura extra do redis". Ao escrever o plano apareceu um detalhe
de correção: se o refresh alterar algo, o **snapshot antigo** de atividades seria mesclado por
cima (`[...novas, ...armazenadas]`, `statistics.ts:112`) e **sobrescreveria a correção**.
Amendar o §1 do design: quando o refresh mudar algo, o cache de atividades é **relido uma
única vez** antes do recompute. Fora isso, o design vale como aprovado.

## Passo 1 — Persistência: `src/services/unrecognized-codes.ts`

1. Type ganha campo opcional (exportado):
   ```ts
   export type StoredUnrecognizedCodes = {
     lastUpdated: number;
     codes: UnrecognizedCode[];
     lastRefreshAttempt?: number; // D14.1 — unix seconds da última tentativa
   };
   ```
2. Novo `getStoredUnrecognizedCodes(athleteId)` → `StoredUnrecognizedCodes | null`
   (mesmos guardas de hoje: chave ausente ou `codes` não-array → `null`; propaga erro do redis).
3. `getUnrecognizedCodes` vira casca sobre o novo: `(await getStored…)?.codes ?? null`
   (comportamento do dashboard idêntico — testes existentes continuam verdes).
4. Novo `recordRefreshAttempt(athleteId, stored)` → `redis.set(chave, { ...stored, lastRefreshAttempt: Math.floor(Date.now() / 1000) })`
   (propaga erro; o chamador é best-effort). `saveUnrecognizedCodes` **intocado** — regrava
   sem `lastRefreshAttempt` depois do recálculo (janela nova, intencional).

## Passo 2 — Servidor: `src/services/statistics.ts`

1. Imports: `fetchStravaActivity` e `processActivity` no bloco de `./activity` (já exportados,
   `activity.ts:220-225`); `getStoredUnrecognizedCodes` e `recordRefreshAttempt` em
   `./unrecognized-codes`.
2. Constante de módulo: `REPORT_REFRESH_MIN_INTERVAL_SECONDS = 600` (10 min).
3. Nova função privada `refreshReportedActivities(strava, athleteId, activities): Promise<boolean>`
   (molde do `backfillUnrecognizedCodes` — try/catch interno, **nunca lança**):
   1. `activities.length === 0` → `false` (antes de qualquer leitura/chamada);
   2. `getStoredUnrecognizedCodes` → sem chave ou `codes = []` → `false`;
   3. throttle: `lastRefreshAttempt` definido e `now - lastRefreshAttempt < 600` → `false`
      (**zero chamada ao Strava**);
   4. `recordRefreshAttempt` **antes** dos fetches, em try/catch próprio (o throttle vale
      mesmo se a tentativa falhar no meio — evita martelar o Strava a cada poll de 60 s);
   5. por cada caso: `Map<number, ActivityBase>` da lista em mão;
      - atividade **fora do cache** (filtro de gear) → `continue` — **não insere**
        (senão `updateActivityInArray` faz prepend indevido, `utils.ts:72`);
      - `fetchStravaActivity(activityId, strava)` em try/catch → falha → `log.warn` e pula
        (caso permanece até um recompute futuro limpá-lo);
      - compara `private_note` **e** `name` com o cache; se mudou →
        `processActivity(detail, athleteId)` e `changed = true` **só se retornou lista**
        (retorna `null` quando a gravação interna falhou);
   6. `changed` → `log.info('Reported activities refreshed; forcing statistics recompute')`;
      retorna `changed`.
4. Wire em `updateStatistics` (após as duas leituras, **antes** do `if`):
   ```ts
   let storedActivities = await apiRemoteStorage.get(REDIS_KEYS.activities(athleteId));
   const storedStatistics = await apiRemoteStorage.get(REDIS_KEYS.statistics(athleteId));

   const refreshed = await refreshReportedActivities(
     strava, athleteId, storedActivities?.data?.activities ?? [],
   );
   if (refreshed) {
     // Passo 0: relê uma única vez — o snapshot anterior sobrescreveria a correção.
     storedActivities = await apiRemoteStorage.get(REDIS_KEYS.activities(athleteId));
   }
   ```
5. Condição do fast path ganha `!refreshed &&` como **primeiro** termo (curto-circuito;
   `refreshed` impede o fast path mesmo com timestamps no mesmo minuto — o caso raro do design §4).
6. `else` (recompute): log distingue
   `refreshed ? 'Recomputing statistics (report refreshed)' : 'Recomputing statistics'`.
   Resto do recompute intocado — com o cache relido, o merge/processStatistics usam a nota
   já corrigida e `saveUnrecognizedCodes` regrava o relatório **sem** o caso resolvido.
7. Backfill do fast path intocado (só roda quando `!refreshed`).

## Passo 3 — Testes

| Arquivo | Ação | Casos |
|---|---|---|
| `tests/unit/services/statistics-flow.test.ts` | estender `LoadOptions`/`loadStatisticsModule` | novos mocks: `fetchStravaActivity`, `processActivity` (em `doMock` de `activity`), `getStoredUnrecognizedCodes`, `recordRefreshAttempt` (em `doMock` de `unrecognized-codes`) — default `getStored…` = `null` mantém todos os testes existentes verdes sem tocar nas cadeias `Once` |
| `tests/unit/services/statistics-flow.test.ts` | novo bloco D14.1 | ① **throttle ativo** → sem fetch, sem `recordRefreshAttempt`, fast path; ② **nota mudou** (timestamps alinhados!) → `fetchStravaActivity(11, strava)` + `processActivity` + 3ª leitura do cache + **recompute forçado** (`getAthlete`/`getActivities`/`saveRemote` chamados) + `saveUnrecognizedCodes` sem o caso + `processActivities` recebe a lista **fresca**; ③ **nota igual** → `processActivity` não chamado, fast path preservado, tentativa registrada; ④ **fetch falha** → `log.warn`, fast path intacto, tentativa registrada (gravada antes); ⑤ **reportada fora do cache** → nem fetch nem insert, fast path; ⑥ **leitura do relatório falha** → `log.warn`, fast path intacto; ⑦ **`recordRefreshAttempt` falha** → refresh prossegue (best-effort) |
| `tests/unit/services/unrecognized-codes.test.ts` | estender | `getStoredUnrecognizedCodes` devolve shape completo (com `lastRefreshAttempt`) e `null` nos mesmos guardas; `recordRefreshAttempt` grava `{ ...stored, lastRefreshAttempt: expect.any(Number) }` preservando `codes`/`lastUpdated`; casca do `getUnrecognizedCodes` continua compatível (testes existentes) |

Zero mudanças esperadas em `dashboard.ts`, `webhook.ts`, `Stats.tsx`, CSS e contratos.

## Passo 4 — Gates

1. `yarn validate` (lint + lint:colors + typecheck + test + build)
2. `yarn lint:colors` (sem par novo — deve seguir verde)
3. `yarn test:report` → regenerar Test Status do Readme; comparar com baseline pós-D14
   (Lines **99,75%** / Functions **100%** / Branches **94,71%**) — sem regressão.

## Passo 5 — Registro local (não commitado) + ciclo git

`docs/plano-usabilidade-gearlife.md` (addendum do §8.16 ou nova §8.17, conforme a
estrutura atual): gap do webhook confirmado (edição de nota não dispara evento; comunidade
corrobora), decisão do caminho B, throttle 10 min na chave já existente, re-read do Passo 0,
recálculo forçado, gates.

Só então, **com o proprietário**: liberar o ciclo git do D14 + D14.1 juntos (branch
`feat/d14-tolerant-codes` → commit → push → PR via API REST com PAT, sem `gh`) — ou nova
instrução do proprietário.

## Fora de escopo

Botão "Atualizar" (A), TTL do cache (C), dispensa persistente em localStorage, refetch de
atividades não reportadas, detecção de novos casos sem webhook (continua no próximo evento do
Strava), e-mail Resend, E2E, alvos ≥44px (Fase D).
