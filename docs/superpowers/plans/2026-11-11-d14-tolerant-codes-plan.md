# Plano — D14: detecção tolerante de códigos com banner warning

> **Data:** 2026-11-11 · **Design:** `docs/superpowers/specs/2026-11-11-d14-tolerant-codes-design.md`
> (**aprovado pelo proprietário em 2026-11-11**, após 2 builder checks).
> **Gate final:** `yarn validate` + `yarn lint:colors` + `yarn test:report`.
> **Nota:** o skill `superpowers:writing-plans` não está disponível neste ambiente; este
> plano foi escrito direto do design aprovado (mesma nota do plano D16).
> **Ciclo git:** implementar + gates primeiro; **perguntar ao proprietário** antes de
> branch/commit/push/PR (D16 usou API REST com PAT; sem `gh`). `docs/plano-usabilidade-gearlife.md`
> nunca entra em commit (artefato local, `skip-worktree`).
> **Baseline de testes (pós-D16):** 59 arquivos / 398 testes; Lines **99,69%** /
> Functions **100%** / Branches **94,60%** — sem regressão.

## Passo 1 — Fundação: chaves, contrato, token e par APCA

1. `src/config/index.ts` — em `REDIS_KEYS` (linha 26):
   `unrecognizedCodes: (athleteId: number) => \`strava:unrecognized-codes:${athleteId}\`,`
   (fora do allowlist do remoteStorage de propósito — escrita via `redis.set` direto, §Fluxo do design).
2. `src/contracts/api.ts` — novo type + campo opcional:
   ```ts
   type UnrecognizedCode = {
     activityId: number;   // ActivityBase.id
     gearName: string;
     startDate: string;    // start_date_local (ISO) — dd/MM/yyyy formatado no cliente
     word: string;
     suggestion: string;
   };
   // em DashboardResponse:  unrecognizedCodes?: UnrecognizedCode[];
   ```
   Exportar `UnrecognizedCode` na lista de `export type`.
3. `src/styles/globals.css` — `--gl-text-on-warning: #1a1a1a;` nos **dois** blocos `:root`
   (após `--gl-text-on-brand`, linhas 57 e 91 — mesmo valor nos temas, molde do `on-brand`).
4. `scripts/validate-color-contrast.mjs` — em `TOKEN_PAIRS`:
   `['--gl-text-on-warning', '--gl-status-warning', 60],`
   (medido no build: Lc 73,2 light / 77,7 dark).

## Passo 2 — Vocabulário PT: `EquipmentSynonyms` em `src/services/equipment.ts`

Mapa curado (formas **brutas** — a normalização acontece no `noteCodes`; termos
**de uma palavra só**, ≥4 letras nos sinônimos, para o matching por substring não
transbordar). Fonte: `caption`/`show` de cada equipamento.

| id | sinônimo(s) | id | sinônimo(s) |
|---|---|---|---|
| `lub` | lubrificação | `chain` | corrente |
| `review` | revisão | `bb` | central |
| `clean` | lavagem | `cassette` | cassete |
| `suspension` | suspensão | `crankset` | pedivela |
| `tires` | pneu | `rearderailleur` | câmbio |
| `tubes` | câmara | `rearshifter` | shifter |
| `tubeless` | selante | `pulley` | roldana |
| `stem` | mesa | `helmet` | capacete |
| `handlebar` | guidão | `shoes` | sapatilha |
| `wheelset` | rodas | `pedal` | pedais |
| `brakes` | freio | `saddle` | selim |
| `disks` | disco | `dropper` | canote |
| `calipers` | caliper | `tape` | fita |
| `levers` | manete | `grip` | manopla |

Deliberadamente **sem** sinônimo: `newshock` (`shock` casaria com
`shockreview`/`shockkit` por substring e registraria um shock **novo** a partir de uma
revisão), `fronttire`/`rearbrake`/etc. com `[colchetes]` (o termo do par registra o
par — mesmo comportamento decidido para `pneu[frente]`), `stis` (`sti` casaria dentro
de palavras como `distrito`). Cobertura que faltar entra no mapa depois, sob evidência.

## Passo 3 — Módulo puro novo: `src/services/noteCodes.ts`

Sem import de redis (unit-testável direto). Exporta:

- `normalizeNote(note)` — `toLowerCase` + NFD strip de acentos (**case-insensitive é
  pedido do proprietário**); `tokenizeNote(noteNormalizado)` — `match(/[\p{L}\p{N}]+/gu)`.
- `TERMS` interno: `{ norm, display }[]` = ids de `Equipments` + `EquipmentSynonyms`
  normalizados (display fica com a forma crua — a sugestão sai acentuada: “revisão”).
- `termsFor(equipmentId)`; `equipmentMatches(noteNorm, tokens, equipmentId)` —
  `terms.some(t => noteNorm.includes(t))` (**substring preservado**) e, só para
  `review`, exige forma isolada em `tokens` (guard do `statistics.ts:245-253`
  estendido às formas PT).
- `findUnresolvedCases(activities)` → `RawCase[]` (`activityId`, `gearId`,
  `startDate`, `word`, `suggestion`) — mesma escopo do registro (nome com `*`,
  `private_note` presente); por token: **resolvido** (`∃ term ⊆ token`, com o guard
  do review) → cala; senão `len ≥ 4` e Levenshtein ≤ 2 contra `TERMS` → reporta com
  sugestão mais próxima (desempate: menor distância, depois ordem alfabética);
  resto é texto livre. Levenshtein DP local (~20 linhas), zero dependência nova.
- `toUnrecognizedCodes(cases, gears)` → `UnrecognizedCode[]`: descarta gear
  desconhecido, dedupe `(activityId, word)`, ordena **data desc, word asc**.

## Passo 4 — Persistência nova: `src/services/unrecognized-codes.ts`

Molde de `thresholds.ts` (e razão de existir: `statistics` e `dashboard` mockam **este
módulo** nos testes, igual fazem com `saveRemote`/`getEquipmentThresholds` — o cliente
nunca toca em redis):

- `saveUnrecognizedCodes(athleteId, codes)` → `redis.set(chave, { lastUpdated, codes })` (propaga erro).
- `getUnrecognizedCodes(athleteId)` → `codes | null` (`null` = chave ausente; propaga erro).

## Passo 5 — Servidor: `src/services/statistics.ts`

1. `createStatistics` (linhas 179-264):
   - por atividade: `noteNorm = normalizeNote(private_note)` + `tokens`;
   - a condição `private_note.includes(equipment.id)` vira
     `equipmentMatches(noteNorm, tokens, equipment.id)` (case-insensitive + sinônimos
     + substring, review guard unificado);
   - resto intocado (switch de cascata, primeira data que vence, `*`).
2. `processStatistics` — **depois** do `saveRemote` bem-sucedido:
   `saveUnrecognizedCodes(athleteId, toUnrecognizedCodes(findUnresolvedCases(acts), gears))`
   em try/catch com `log.warn` (**best-effort**; falha não derruba as estatísticas).
3. `updateStatistics` — no caminho de cache (linha 41): **backfill** antes do return,
   best-effort: `getUnrecognizedCodes` → `null`? senão não mexe; `findUnresolvedCases`
   em `storedActivities.data.activities` (já em mão); `[]` se não houver casos, senão
   `getAthlete` + `getGears` para os nomes (só paga a chamada Strava quando há caso);
   grava **sempre** (inclusive `[]` — backfill roda uma vez por atleta).

## Passo 6 — API

1. `src/pages/api/dashboard.ts` — após o bloco do `equipmentThresholds` (linhas 56-61),
   mesmo molde try/catch: `if (hasGear && hasActivities)` → `getUnrecognizedCodes` →
   `codes?.length` → `response.unrecognizedCodes = codes`; falha → `getLogger().error`
   (o mock de logger do teste só tem `error`) e a resposta vai sem o campo.
2. `src/pages/api/webhook.ts` — `REDIS_KEYS.unrecognizedCodes(athleteId)` no `redis.del`
   do `delete` do atleta (linhas 517-522) — LGPD, item 4 do builder check.

## Passo 7 — Cliente

`src/components/Stats.tsx`:

1. Imports: `UnrecognizedCode` (contracts), `format, parseISO` (date-fns — molde
   `CardItem.tsx:41-42`: `parseISO(date.replace(/Z$/, ''))` + `format(…, 'dd/MM/yyyy')`),
   ícone `MdWarningAmber` (`react-icons/md` — confirmar export no pacote).
2. Estados: `const [unrecognizedCodes, setUnrecognizedCodes] = useState<UnrecognizedCode[]>([])`
   e `const [dismissedCases, setDismissedCases] = useState<Set<string>>(new Set())`
   (Set de `activityId:word` — reset natural no remount/reload; molde do
   `alertedEquipmentIds`).
3. `readCachedDashboard` (linhas 86-127): ler `sessionStorage['unrecognizedCodes']`
   (`?? '[]'`) para o campo; efeito da cache (linha 157): `setUnrecognizedCodes(… ?? [])`.
4. Efeito do dashboard fresco (junto às linhas 190-206): gravar a chave no
   `sessionStorage` e `setUnrecognizedCodes(dashboard.unrecognizedCodes ?? [])`.
5. `dismissedCases` / visibilidade:
   `const caseKey = c => \`${c.activityId}:${c.word}\``;
   visível = `hasGear && hasActivities && codes.length > 0 && codes.some(c => !dismissed.has(caseKey(c)))`;
   ✕ → adiciona todas as chaves visíveis ao Set.
6. JSX — logo **depois** do bloco do `.errorBanner` (linha 304) e **antes** da cadeia
   de empty states (precisa renderizar com `gearStats === []`):
   - caixa `.codesWarningBanner` com ícone (`aria-hidden`) + botão ✕
     (`aria-label='Dispensar aviso de código não reconhecido'`);
   - frases dentro de `<div role='status' aria-live='polite'>` (uma `<p>` por caso):
     `Há um código não reconhecido na observação privada da atividade de {gearName} do
     dia <a href={'https://www.strava.com/activities/' + activityId} target='_blank'
     rel='noopener noreferrer'>{dd/MM/yyyy}</a>. “{word}” — você quis dizer
     “{suggestion}”? Corrija no Strava para atualizar aqui no GearLife.`
     (**aspas tipográficas** `“ ”` — `react/no-unescaped-entities` barra as retas em JSX).

`src/styles/components/Stats.module.css` — `.codesWarningBanner` (fundo
`var(--gl-status-warning)`, cor `var(--gl-text-on-warning)`, `border-radius: 1rem`
(molde `.skeletonCard`), padding com folga à direita para o ✕, `position: relative`,
`.codesWarningBanner p { margin: 0 }` com `+ p` espaçando) e `.codesWarningClose`
(absoluto, `background: transparent`/`border: none`/`color: inherit`, hover por
`opacity` — **sem cor literal nova**, foco `outline: 2px solid currentColor`).

## Passo 8 — Testes (design, tabela Testes → arquivo)

| Arquivo | Ação | Casos |
|---|---|---|
| `tests/unit/services/note-codes.test.ts` | **novo** | normalização (`Chain`/`CHAIN`/acentos); classificação: `chainn` calado, `chian` → `chain`, `reviewx`/`reviews` → `review`, `shockreview`/`revisão` calados, `troquei` calado, len<4 calado; escopo (`*`, private_note); `toUnrecognizedCodes` (gearName, gear desconhecido descartado, 2 atividades mesma palavra → 2 entradas, ordem) |
| `tests/unit/services/statistics.test.ts` | adicionar `describe` | registro: `CHAIN` (case), `troquei a corrente`, `chainn` registra `chain`, `revisão` isolada registra `review`, `suspareview` não registra `review` (guard + variantes), `freios` → `brakes`; regressão: caso `reviewx lub` existente (linha 56) permanece verde |
| `tests/unit/services/statistics-flow.test.ts` | estender `loadStatisticsModule` | `doMock` de `unrecognized-codes` (`save`/`get`) + `warn` no logger; `processStatistics` grava via `saveUnrecognizedCodes` (`[]` para notas comuns), `save` rejeita → stats intactas, stats falham → throw (sem gravar); cache alinhado: chave existente → **não** toca; chave ausente → backfill grava `[]` (sem `getAthlete`), com caso `chian` → `getAthlete`+`getGears` e grava com `gearName`; backfill rejeita → retorno intacto |
| `tests/integration/dashboard.test.ts` | +`vi.mock` do serviço | campo presente com casos; `null` → campo omitido; rejeição → omitido + `logger.error`; `hasGear=false` → `getUnrecognizedCodes` não chamado |
| `tests/integration/webhook.test.ts` | ajustar delete (~linha 346) | `redisMock.del` inclui `strava:unrecognized-codes:987` |
| `tests/unit/components/stats-codes-banner.test.tsx` | **novo** (harness do `stats.test.tsx`) | copy exata + `href`/`target`/`rel` + classe warning; ✕ esconde; remount volta; caso novo reabre; rename (`gearName` novo com mesmo `activityId:word`) **não** reabre; todos dispensados → some; `gearStats: []` ainda renderiza; sem casos → nada; cache do `sessionStorage` pinta na primeira renderização |
| `tests/unit/config/index.test.ts` | se cobre `REDIS_KEYS` | nova chave |

## Passo 9 — Gates

1. `yarn validate` (lint + lint:colors + typecheck + test + build)
2. `yarn lint:colors` (par novo verde nos dois temas)
3. `yarn test:report` → regenerar Test Status do Readme; comparar com a baseline
   pós-D16 (Lines **99,69%** / Functions **100%** / Branches **94,60%**) — sem regressão.

## Passo 10 — Registro local (não commitado) + ciclo git

`docs/plano-usabilidade-gearlife.md`:

1. **§4 (linha D14):** execução concluída; exemplo do plano `chainh` **substituído por
   `chian`** (superstrings registram e ficam mudas — semântica nova) + sinônimos/case.
2. **§5 (tabela):** D14 ✅ com data; nota do canal (banner in-app; e-mail = futuro).
3. **§8.16:** brainstorming (perguntas × decisões), 2 builder checks e resoluções,
   cópia/link/estilo warning, backfill, purge LGPD, token `--gl-text-on-warning`, gates.

Só então, **com o proprietário**: branch `feat/d14-tolerant-codes` → commit (nunca o
plano local) → push → PR via API REST (PAT no `origin`) → merge como no D16.

## Fora de escopo

E-mail (Resend, futuro), aceitar quase-códigos, reportar superstrings, ML além de
Levenshtein ≤ 2, cap de linhas, detecção em atividade sem `*`, mudar a convenção `*` ou
o formato do remoteStorage, purge do `equipmentThresholds` (gap pré-existente — item à
parte), E2E, alvos ≥44px (Fase D).
