# Design — D14.1: auto-refresh do relatório de códigos não reconhecidos

> **Data:** 2026-11-11 · **Decisão do proprietário:** caminho B ("Pode fazer o recomendado").
> **Contexto:** teste manual do D14 (atividade `11679978677`, `rearbreake` → `rearbrake`)
> mostrou que **editar apenas a observação privada no Strava não dispara webhook** — o
> banner nunca some depois da correção, e a cópia aprovada promete *"Corrija no Strava
> **para atualizar aqui** no GearLife"*.

## Por que (o problema, confirmado no código)

- Se o webhook `update` chegasse, a cadeia inteira funcionaria (`fetchStravaActivity` →
  `processActivity` → recompute → relatório novo lido no mesmo GET) — **o que falta é o gatilho**.
- Fora do webhook, **nada rebusca observações antigas**: o recompute do dashboard só busca
  atividades *maiores* que `lastUpdated` (`statistics.ts:106-112`); refetch completo só com cache vazio.
- O relatório só é reescrito por `processStatistics` ou pelo backfill (que roda **uma vez**).
- Comunidade do Strava confirma lacunas parecidas de webhook em edições.

## Abordagens avaliadas

| Abordagem | O que é | Veredito |
|---|---|---|
| A — botão "Atualizar" no banner | endpoint refaz a cadeia do webhook no clique | ❌ exige ação do usuário; não cumpre a cópia (pode virar complemento futuro) |
| **B — auto-refresh com throttle** | dashboard GET, havendo casos e ≥10 min da última tentativa, rebusca só as atividades reportadas | ✅ **escolhido pelo proprietário** — cumpre a promessa, ~1 chamada Strava/10 min por atleta com banner (limite: 300/15 min) |
| C — TTL do cache de atividades | refetch completo se cache velho | ❌ pesado (paginação inteira + detalhe de toda atividade com `*`) e o banner só some após o TTL |
| Dispensar em localStorage (✕ persistente) | some pra sempre | ❌ esconde sem resolver e contradiz a cópia — quem não corrigiu veria o caso sumir |

## Decisões (como fica)

1. **Gatilho:** `refreshReportedActivities()` dentro de `updateStatistics`, **depois** das
   leituras de `activities`/`statistics` (a lista de atividades é passada como parâmetro —
   zero leitura extra do redis) e **antes** da decisão fast-path/recompute.
   *Amenda 2026-11-11 (detalhe descoberto na escrita do plano):* se o refresh **alterar**
   algo, o cache de atividades é **relido uma única vez** antes do recompute — sem isso o
   snapshot antigo seria mesclado por cima (`[...novas, ...armazenadas]`) e sobrescreveria
   a correção. Custa +1 GET só no caso raro de mudança real.
2. **Throttle:** 600 s, gravado em `lastRefreshAttempt` **dentro da própria chave**
   `strava:unrecognized-codes:{id}` (sem chave nova; purge LGPD já cobre). Registrado
   **antes** dos fetches — vale mesmo se a tentativa falhar no meio. Vale para qualquer
   chamador (dashboard ou webhook), então evento em rajada não multiplica chamadas.
3. **Escopo do refresh:** somente os `activityId` do relatório — 1 `fetchStravaActivity`
   por caso. Compara `name` e `private_note` com o que está no cache; **grava só se
   mudou** (via `processActivity`, que faz o merge). Regras de borda:
   - atividade reportada **fora do cache** (ex.: filtro de gear) → **não insere** — senão
     `updateActivityInArray` faria um prepend indevido (`utils.ts:72`);
   - fetch falho (ex.: deletada no Strava) → pula com `log.warn`, caso permanece até um
     recompute futuro limpá-lo.
4. **Recálculo forçado:** se algo mudou, `updateStatistics` **ignora o alinhamento de
   minutos** (`differenceInMinutes === 0`) e recalcula — fecha o caso raro em que a nota
   muda no mesmo minuto do último save, em que o fast path engoliria a mudança e o
   banner persistiria até o próximo evento do Strava.
5. **Leitura do relatório:** novo `getStoredUnrecognizedCodes()` devolvendo
   `{ lastUpdated, codes, lastRefreshAttempt? }`; o `getUnrecognizedCodes()` do dashboard
   continua igual (por cima do novo). `saveUnrecognizedCodes` (pós-recálculo) regrava **sem**
   `lastRefreshAttempt` — janela nova, intencional: dados mudaram, vale tentar cedo de novo.
6. **Best-effort absoluto:** qualquer falha → `log.warn` e o fluxo normal das estatísticas
   segue intacto (nunca derruba o dashboard). Sem relatório ou sem casos → sai antes de
   qualquer chamada ao Strava (custo base: +1 GET do redis por leitura do dashboard).
7. **UI:** nenhuma mudança — banner, copy, ✕ e cache do `sessionStorage` intactos.

## Fora de escopo

Botão "Atualizar" (A), TTL geral do cache (C), dispensa persistente, refetch de atividades
não reportadas, detecção de **novos** casos sem webhook (continua aparecendo no próximo
evento do Strava, como hoje), e-mail Resend.

## Verificação prevista

- `statistics-flow.test.ts`: throttle respeitado (attempt recente → sem fetch); nota mudou →
  `processActivity` + **recompute forçado mesmo com timestamps alinhados**; nota igual →
  fast path preservado; fetch falha → best-effort + tentativa registrada + stats retornadas;
  reportada fora do cache → não insere; sem relatório → zero fetch (e nada consome a cadeia
  de `Once` do mock de `apiRemoteStorage`).
- `unrecognized-codes.test.ts`: shape completo, `recordRefreshAttempt` preserva `codes`/`lastUpdated`.
- Gates: `yarn validate` + `yarn lint:colors` + `yarn test:report` sem regressão
  (baseline pós-D14: 62 arquivos / 441 testes; Lines 99,75% / Functions 100% / Branches 94,71%).

## Plano

`docs/superpowers/plans/2026-11-11-d14-report-refresh-plan.md` — escrito direto do design
aprovado (o skill `writing-plans` segue indisponível neste ambiente, mesma nota do plano D14).
