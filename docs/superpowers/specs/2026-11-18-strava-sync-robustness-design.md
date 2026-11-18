# Design — Sync Strava: atribuição de quota, gravação merge-safe e single-flight

> **Data:** 2026-11-18 · **Decisão do proprietário:** "pode fazer os 3" (os três itens
> propostos após a verificação de produção do rate limit e a reconstrução dos cards).
> **Revisão de design (builder check):** 3 pontos levantados por um revisor
> independente e resolvidos com o proprietário — **`synced_at`** no merge (Q1),
> **guarda LGPD no delete** (Q3); o teto de espera cross-instance (Q2) é chamada minha,
> marcada abaixo.
> **Escopo:** só backend — nenhuma mudança de UI. Ordem de implementação:
> 1 → 2 → 3 (observabilidade primeiro, para enxergar o efeito das mudanças de concorrência).

## Por que (os três problemas, confirmados no código)

### 1. Não sabemos quem consome o quota

- `reportRateLimit` (`src/server/strava-client.ts:28`) loga o usage **absoluto, sem
  contexto** — não dá para saber se o consumo veio do poll do dashboard, do webhook ou de
  um rebuild completo.
- Quota real do app em produção: **600 leituras/15 min e 6000/dia** (janelas
  :00/:15/:30/:45 UTC); os comentários do código ainda citam os 100/15min do tier padrão.
- Sem atribuição, a pergunta "rebuild ≈210 chamadas cabe na janela de 600?" só se
  responde inspecionando Redis/logs à mão (foi exatamente o que fizemos nesta sessão).

### 2. A gravação de `activities` não é merge-safe (lost update)

- `updateStatistics` lê a chave `strava:activities` no início
  (`src/services/statistics.ts:44`) e **regrava o array inteiro** no final (`:157`),
  depois de segundos (cache) a minutos (rebuild de ~210 chamadas) de trabalho.
- Qualquer escrita do meio — webhook `processActivity` (update/create), delete — é
  **sobrescrita** pelo snapshot antigo. Exemplo real: nota atualizada perdida.
- Bônus do mesmo bug: o concat `[...fetched, ...stored]` (`:149`) pode conter **id
  duplicado** em corrida (webhook criou a atividade durante o recompute) →
  `createStatistics` (`:389`) conta a atividade em **dobro** nos cards.
- O mesmo padrão read → chamada Strava → write existe no webhook de create
  (`webhook.ts:437` → `:500`) e de delete (`:437` → `:509`).

### 3. Recomputes concorrentes (falta single-flight)

- Poll do dashboard (60s, `useAutoSync`), webhook e revalidação de aba podem rodar
  `updateStatistics` **ao mesmo tempo** para o mesmo atleta: dois rebuilds completos em
  paralelo (~210 chamadas cada), escritas em corrida e quota queimada em dobro.
- Call sites: `dashboard.ts:51`, `webhook.ts:472`, `:518`, `:578`.

## Abordagens avaliadas

### Item 1 — atribuição do consumo

| # | Abordagem | Veredito |
|---|---|---|
| A | Só enriquecer o log com campos | resolve "quem", mas não dá agregação |
| **B** | **`context`/`athleteId` no `createStravaClient` + log por resposta + contador `strava_api_responses_total{context}`** | ✅ **escolhido** — reusa a infra de métricas existente (`metrics.ts` + rota `/api/metrics`), cardinalidade baixa, custo zero de infra nova |
| C | Chaves Redis por janela (`strava:quota:<janela>:<context>`) | ❌ redundante: o log já carrega o usage **absoluto da janela** com timestamp; o contador cumulativo por contexto responde a distribuição |

### Item 2 — gravação merge-safe

| # | Abordagem | Veredito |
|---|---|---|
| A | Só re-read + merge no write de `statistics.ts:157`, sem lock | fecha a janela de minutos; deixa janela residual de ~ms |
| **B** | **A + lock curto por atleta em todos os pontos de escrita da chave (helper único)** | ✅ **escolhido** — fecha a classe inteira; a seção é ms-curta e as escritas são esporádicas, o custo Upstash (2 HTTP por escrita) é desprezível |
| C | CAS / campo de versão na chave | ❌ exigiria mudar o caminho de escrita (hoje é HTTP `remoteStorage`): endpoint novo ou escrita direta no Redis — peso desproporcional para o problema |

### Item 3 — single-flight

| # | Abordagem | Veredito |
|---|---|---|
| **A** | **Map in-process + lock Redis por atleta, com espera e fallback** | ✅ **escolhido** — mesmo molde do lock de refresh de token que o projeto já usa e opera bem (`strava-auth.ts:134`, `LOCK_CONFIG`) |
| B | Só Map in-process | ❌ não cobre múltiplas instâncias (Upstash ⇒ execução em várias lambdas/containers) |
| C | Só lock Redis | ❌ perde a dedupe exata e barata do mesmo processo e piora a latência de quem chega junto |

## Decisões (como fica)

### 1. Atribuição (`context` + log + contador)

1. `createStravaClient(tokens, ctx?: { context: string; athleteId?: number })` — o
   `on_rate_limit_update` vira closure com `ctx`; `reportRateLimit(rateLimit, ctx?)`.
2. Call sites rotulados: `dashboard` (`dashboard.ts:37`), `webhook.activity`
   (`webhook.ts:445`), `webhook.athlete` (`webhook.ts:573`).
3. Log por resposta: `{ rateLimit, context, athleteId }`; o warn de 80%
   (`RATE_LIMIT_WARN_RATIO`) também ganha `context`.
4. Contador `strava_api_responses_total{context}` em `metrics.ts` (1 relatório ≈ 1
   resposta ≈ 1 unidade de quota) — exposto automaticamente em `/api/metrics`.
   **`athleteId` só no log**, nunca como label (cardinalidade).
5. Granularidade aceita como limite: `context` distingue os 3 fluxos, não
   rebuild-vs-cache-hit dentro do fluxo — para isso basta o log existente
   `Recomputing statistics`.

### 2. Merge-safe (helper de escrita + merge no recompute)

1. Helper `withActivitiesWriteLock(athleteId, fn)` em `activity.ts`:
   - lock `strava:lock:activities:<athleteId>` com `SET NX PX 30000` (Upstash);
   - dentro: reler a chave → `fn(dadosAtuais)` → gravar via `processActivities`
     (mantém o stamp de `lastUpdated=now` de hoje) → liberar;
   - lock ocupado → espera com poll (100ms, teto 2s); estourou o teto → executa mesmo
     assim com `log.warn` (degrada **exatamente** para o comportamento atual, nunca pior).
2. **Frescor por atividade — `synced_at` (Q1, decidido pelo proprietário):**
   `ActivityBase` ganha campo opcional `synced_at?: number` (epoch s) = "esta cópia
   foi lida do Strava às HH:MM". Carimbado em **toda leitura**: no push final de
   `getActivities` (`activity.ts:162`, após o detalhe) e em `safeActivityParse`
   (`utils.ts:108`, caminho do webhook/`processActivity`).
   *Por quê:* sem carimbo, a regra "delta vence" reverteria uma escrita **mais nova**
   do webhook que chegou depois do fetch do recompute — num rebuild completo a janela é
   de minutos e o sintoma é o mesmo de sempre (nota/perfil perdido). Exemplo:
   recompute busca X às 14:00 (`nota=revisão`), webhook grava às 14:01
   (`nota=revisão+câmbio`), recompute salva às 14:02 → sem carimbo, o câmbio some.
   *Compatibilidade sem migração:* cópia antiga sem campo vale **0** (é antiga de
   verdade) — qualquer cópia carimbada vence; empate ou ambos sem carimbo → delta.
3. Merge no write do recompute (`statistics.ts:157`), com dois insumos:
   - **base** = releitura no momento da gravação (se a chave estiver vazia/ausente, o
     snapshot lido no início);
   - **delta** = o que este recompute buscou do Strava (full fetch ou `after=lastUpdated`).
   Regras por id (refinamento `deltaComplete`, descoberto na implementação):
   - **só na base** → mantém **no delta incremental** (`after=lastUpdated`) —
     é aqui que vivem as escritas do webhook que chegaram durante o
     recompute: **este é o fix do lost update**. Num delta **completo**
     (from-scratch / migração legada) o base-only cai fora: atividade que o
     Strava não devolveu mais é apagada ou está com gear inativo — mantê-la
     sobreviveria sem `sport_type` e reabriria o rebuild completo a cada poll
     (loop infinito de migração). As escritas do webhook que interessam num
     delta completo estão no próprio delta (o Strava as devolve) e vencem por
     `synced_at`;
   - **só no delta** → adiciona; **exceto** se estava no snapshot inicial e sumiu da base
     (deleção aconteceu durante a janela → respeita, não ressuscita);
   - **nos dois** → vence a cópia com **`synced_at` mais novo** (regra do item 2);
     sem carimbo dos dois lados → delta (no rebuild/migração o delta é a fonte do
     `sport_type` novo — sem isso a migração de atividades legadas quebraria).
   - Dedupe por id em todos os casos (corrige a duplicação do concat atual).
4. O array **mesclado é o que vai para `processStatistics`** — cards e chave de
   activities passam a derivar do mesmo estado (elimina a dupla-contagem).
5. Os outros três pontos de escrita da chave passam pelo mesmo helper:
   - `processActivity` (webhook update/create/D14.1) — lógica interna igual, só ganha a
     seção crítica;
   - webhook create (`webhook.ts:500`) — `mergeActivities(fetched, baseRelida)`;
   - webhook delete (`webhook.ts:509`) — filtro sobre a base relida.
6. O re-read do D14.1 (`statistics.ts:65`) permanece como está (cinto e suspensório);
   a garantia real passa a ser o merge no write.
7. Observabilidade do merge: log com o resumo `{ added, keptFromBase, deltaWins,
   removed }` quando houver divergência base≠snapshot — é a evidência que diz se a
   janela residual (tabela de riscos) algum dia aconteceu.

### 3. Single-flight em `updateStatistics`

1. `Map<number, Promise<GearStats[]>>` no módulo (server-only) + lock
   `strava:lock:statistics:<athleteId>` com `SET NX PX 300000` (300s > rebuild
   observado de ~2 min / ~210 chamadas; **sem heartbeat** — simplicidade).
2. Fluxo de entrada de `updateStatistics`:
   a. voo em andamento no Map → **aguarda a mesma promise** (mesmo processo: dedupe
      exata; o chamador recebe o resultado real, não cache velho);
   b. senão tenta o lock Redis;
   c. lock ocupado (outra instância) → poll a cada 500ms, **teto 30s** (chamada minha:
      15s nunca enganchava em rebuild completo — o outro voo leva ~2 min — e 30s ainda
      cabe em orçamento de função): se `statistics.lastUpdated` avançou desde a chegada
      → **devolve o cache** (o outro voo terminou bem); se o lock liberou → volta ao (b);
   d. estourou o teto → se **existe cache** de statistics → **devolve ele mesmo
      (stale-ok)** com `log.warn` — dedupe do rebuild vale mais que frescor de um ciclo
      (o próximo poll busca o resultado pronto); **sem cache** (1ª sincronização) →
      calcula mesmo assim (tenta o lock uma vez; sem lock, calcula com `log.warn`) —
      correção > dedupe.
3. Quem adquire: registra a promise no Map, roda o corpo **inteiro** (fast-path,
   D14.1, recompute) e no `finally` apaga do Map e libera o lock.
4. Liberação do lock: `del` incondicional — mesmo precedente do `refreshLock`
   (a seção é ms-vs-TTL 300s; risco documentado).
5. `webhook.ts:587` (delete do atleta) passa a limpar também
   `strava:lock:statistics` e `strava:lock:activities`.
6. Webhook que cai num voo alheio **espera** — aceito: hoje o webhook já roda recompute
   completo síncrono; o teto de duração não piora, e retries do Strava se coalescem no
   mesmo voo.

### 4. Delete do atleta não ressuscita dados (LGPD — Q3, decidido pelo proprietário)

Hoje o delete (`webhook.ts:587`) apaga as chaves, mas um recompute em andamento pode
**regravar tudo no fim do voo** — e sem próximo evento o dado "ressuscitado" persiste
para sempre (bug pré-existente; o fallback de snapshot do merge o garantiria em um dos
caminhos). Fechamento:

1. **Espera do voo:** antes de apagar, o handler espera o lock
   `strava:lock:statistics` liberar (poll 500ms, **teto 10s**) — na prática, o voo
   termina e o delete limpa o resultado inteiro. Estourou o teto → apaga mesmo assim
   (incluindo as duas locks).
2. **Guarda de auth:** helper `athleteStillExists(athleteId)` (1 GET em
   `strava:auth:<id>`) chamado **antes de toda gravação de dados**: dentro do
   `withActivitiesWriteLock`, antes do save de `processStatistics` e antes do backfill
   de unrecognized-codes. Auth ausente (delete aconteceu) → **pula a gravação** com
   `log.info` — nunca recria dado de atleta deletado.
3. Residual aceito e documentado: a janela de ms entre o GET de auth e a gravação de um
   voo que rodou **sem** lock (caminho de fallback do single-flight) — ordem de
   grandezas menor que a janela de minutos de hoje.

## Fora de escopo

- UI, cards, captions, catálogo de equipamentos (tênis/luzes já decididos em PRs anteriores).
- Heartbeat de lock / liberação compare-and-delete (`EVAL`) — o precedente do
  `refreshLock` já é `del` incondicional e opera bem.
- Chaves de quota **por janela**; painel de métricas novo (a rota `/api/metrics`
  existente já publica o contador).
- Fila/retry de webhooks; orçamento automático de quota (o teto continua sendo o 429 +
  `Retry-After` já implementado).
- Oggi 7.3 e pedais de 2021-22 (decisão: ignorar).

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Lock ficou preso (holder morreu) | TTL (30s / 300s) expira sozinho; waiters caem no fallback de cálculo |
| `del` incondicional libera lock de outro após estourar o TTL | seção típica em ms vs TTL; `log.warn` no caminho |
| Janela residual do merge (entre reler e gravar dentro do lock, ~1 HTTP, ou voo sem lock no fallback) | ms vs minutos de hoje; `synced_at` fecha a janela de minutos do rebuild; log de divergência do merge como radar |
| Cópia antiga sem `synced_at` (~1.200 em cache) | vale 0 → qualquer cópia nova vence (comportamento desejado); sem migração |
| Delete × voo (ressuscitação LGPD) | espera do lock + guarda de auth antes de toda gravação (decisão Q3); residual: janela de ms no caminho sem lock |
| Webhook segurado durante voo longo | teto = duração do voo ≤ pior caso atual; Strava retry coalesce no mesmo voo |
| Atividade criada **e** deletada dentro de uma única janela de recompute | ressuscitação temporária até o próximo evento/rebuild completo — aceito e raro |
| Map reseta com hot-reload em dev | inócuo: só perde dedupe do processo |

## Validação

- `yarn validate` verde (base atual: **498 testes**).
- Testes novos:
  - `tests/unit/server/strava-client.test.ts` — `reportRateLimit` com `ctx` (campos do
    log, warn de 80% com context) e contador com label;
  - concorrência webhook × recompute — escrita do webhook no meio do recompute
    sobrevive; delete na janela é respeitado; id novo entra; sem duplicatas;
  - `synced_at` — cópia mais nova vence nos dois sentidos; sem carimbo perde para
    carimbada; empate → delta;
  - helper de lock — adquire, espera, fallback pós-timeout;
  - single-flight — duas chamadas concorrentes no mesmo processo executam o corpo uma
    vez; lock ocupado devolve cache fresco; teto 30s devolve cache stale; sem cache,
    calcula;
  - LGPD — delete durante recompute: guarda de auth pula a gravação; delete espera o
    lock antes de apagar.
- CI (`quality` + `GitGuardian`) verde no PR.

## Entrega

- **Um PR, três commits** na ordem: (1) atribuição → (2) merge-safe (`synced_at` +
  helper de escrita + guarda de auth) → (3) single-flight (+ espera/limpeza de locks no
  delete) — cada commit destravando o review do item seguinte.
