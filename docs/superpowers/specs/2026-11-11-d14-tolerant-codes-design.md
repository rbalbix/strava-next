# Design — D14: detecção tolerante de códigos com banner warning

> **Data:** 2026-11-11
> **Escopo:** item D14 do `docs/plano-usabilidade-gearlife.md` (§4) — canal do relato =
> **banner in-app** (decisão do proprietário, 2026-11-09; e-mail via Resend vira item
> futuro, opt-in/LGPD) e caminho de construção **①** aprovado na conversa (2026-11-11).
> **Status:** rascunho aguardando aprovação do proprietário.
> **Revisão 1 — builder check** (subagente fresco, sem a conversa) em 2026-11-11 —
> 4 perguntas, todas resolvidas nas seções abaixo (chave de escrita, contraste APCA
> do dark, backfill de deploy e purge LGPD).
> **Revisão 2 — ajuste do proprietário (2026-11-11):** registro volta a substring
> (superstrings registram e ficam mudas) **+ case-insensitive**; banner só para
> **não resolvidos**. Refeito e re-checado: **builder check 2** achou 3 perguntas,
> resolvidas no doc (resolvido = **registrou de verdade**, espelhando o guard do
> `review`; linhas duplicadas do mesmo dia mantidas; dispensa por identidade de caso).

## Intent / por quê

A varredura da nota privada (`statistics.ts:179-264`) testa
`private_note.includes(equipment.id)`: só códigos em inglês batem. Quem escreve
"corrente" perde o registro **sem nenhum sinal** e quem erra um código de um jeito
que quebra o casamento (`chian`) também — "a diferença entre funcionar e parecer
não funcionar" (§4). O D14
faz três coisas: **(a)** aceita sinônimos PT no registro (`corrente`→`chain`,
`lubrificação`→`lub`…), **(b)** torna o matching **case-insensitive** (`Chain`,
`CHAIN` passam a registrar) e **(c)** **reporta** em um banner warning no topo do
dashboard os casos que **ficaram não resolvidos** — a palavra não bateu com nada do
vocabulário e ainda assim se parece com um código — com sugestão e link direto para
a atividade no Strava.

> **Revisão do design (decisão do proprietário, 2026-11-11):** superstrings
> **continuam registrando e ficam mudas** — `chainn` conta como `chain` e não gera
> banner (eram os exemplos do §4 do plano e da conversa). O caso canônico do relato
> passa a ser o **não resolvido mesmo**: `chian` → "você quis dizer `chain`?" — a
> copy só aparece quando o registro de fato não aconteceu.

## Comportamento (acordado no brainstorming)

- **Retrato do estado, não evento:** a cada **abertura do app**, se os dados atuais
  ainda tiverem código não resolvido → o banner aparece **no topo do dashboard**
  (acima dos cards, depois do `.errorBanner`).
- **✕ fechável:** some na hora; a dispensa é **por caso** e vive só na sessão do
  componente — recarregou o app e o problema continua → volta; **um caso novo**
  aparecer (revalidação dos 60s) → volta mesmo sem recarregar; renomear a bike não
  reabre; corrigiu os casos no Strava → as linhas somem sozinhas.
- **Some sozinho:** o usuário corrige a nota no Strava → webhook de atividade
  (`update`: `webhook.ts:409-412` rebusca e `processActivity` regrava as atividades) →
  rebuild das estatísticas → a chave do relato é regravada sem casos → o banner some,
  tenha dispensado ou não.
- **Só não resolvidos** (decisão do proprietário, 2026-11-11): o banner não aparece
  para palavra que já registrou por substring (superstring) nem para texto livre —
  só o quase-código que não bateu com nada.
- **Estilo warning** (âmbar), fechável, **uma frase por caso** empilhada no mesmo
  banner; a **data da frase é o link** para a atividade (decisão do proprietário:
  a data é o único elemento que identifica aquele caso específico — a palavra
  "atividade" é genérica; com vários casos, cada data aponta para a sua).

### Copy final (por caso)

> Há um código não reconhecido na observação privada da atividade de **{gearName}** do
> dia **[{dd/MM/yyyy}](https://www.strava.com/activities/{activityId})**. "{word}" —
> você quis dizer "{suggestion}"? Corrija no Strava para atualizar aqui no GearLife.

```
┌────────────────────────────────────────────────────────────────────┐
│ ⚠  Código não reconhecido                                         │
│ Há um código não reconhecido na observação privada da atividade de │
│ Bike A do dia 05/11/2026. "chian" — você quis dizer "chain"?       │
│ Corrija no Strava para atualizar aqui no GearLife.            ✕  │
└────────────────────────────────────────────────────────────────────┘

        [ seus cards de bikes / manutenção ]
```

## Fluxo do dado (caminho ① — aprovado)

Descartados: ② guardar no payload de estatísticas (muda a assinatura de
`updateStatistics` usada pelo `webhook.ts` em 3 pontos **e** o formato salvo — dados
já cacheados exigiriam migração) e ③ detecção no cliente (duplica o mapeamento
nota→componente que o servidor já é dono e depende de todas as atividades estarem
carregadas — "às vezes aparece, às vezes não").

1. **Coleta (servidor):** `processStatistics` (`statistics.ts:115-142`) chama
   `collectUnrecognizedCodes(activities, gears)` e, **depois** de salvar as
   estatísticas com sucesso, grava o resultado em
   `REDIS_KEYS.unrecognizedCodes(athleteId)` — **`redis.set` direto** (molde de
   `thresholds.ts:96`), **nunca** `saveRemote`: o `RemoteStorageKeySchema`
   (`contracts/api.ts:41-48`) só aceita `^strava:(activities|statistics):\d+$` e
   rejeitaria a chave nova com 403 — e o `saveRemote` engole o 403 em
   `success: false`, uma falha silenciosa que os unit tests (que mockam
   `saveRemote` no boundary) nunca pegariam. Escrita **best-effort**: falhou, log
   de warn e as estatísticas seguem intactas; contrato de remoteStorage intocado.
2. **Caminho de cache:** o early-return de `updateStatistics`
   (`statistics.ts:28-41`) não toca na chave → o relato continua sendo o do último
   rebuild (desejado: é o retrato que reaparece a cada abertura).
   **Exceção backfill (pós-deploy):** se a chave ainda não existir, o cache path
   varre `storedActivities.data.activities` — que ele **já leu** (linhas 20-22) — e
   grava (inclusive `[]`, para nunca repetir). Sem isso, no dia do deploy todo
   mundo estaria com o cache alinhado → nenhuma chave escrita → o banner só
   apareceria após o próximo evento do Strava, contrariando "sempre que abrir o
   app e não estiver resolvido, aparece". A coleta roda em 2 estágios: varredura
   pura (só atividades — quem não tem quase-código não paga nada) e, **só se
   houver casos**, `getAthlete` para anexar o nome da bike.
3. **Dashboard:** `src/pages/api/dashboard.ts` lê a chave em try/catch **no molde do
   `equipmentThresholds`** (linhas 56-61), **somente quando `hasGear && hasActivities`**
   (mesma condição que roda `updateStatistics` — evita relato velho sobre tela vazia),
   e devolve `unrecognizedCodes` opcional na resposta. (`/api/app/dashboard` é
   re-export desse handler — `src/pages/api/app/dashboard.ts:1` — um ponto só.)
4. **Contrato:** `src/contracts/api.ts` ganha `UnrecognizedCode` e o campo opcional
   `unrecognizedCodes?: UnrecognizedCode[]` em `DashboardResponse`.
5. **Cliente:** `Stats.tsx` persiste o campo no `sessionStorage` junto de `gearStats`
   (linhas 190-206) e lê no `readCachedDashboard` (86-127) — o banner pinta já na
   primeira renderização do reload, antes do SWR responder; o fetch fresco sobrescreve.
6. **UI:** banner em `<main>`, logo **depois** do bloco do `.errorBanner`
   (`Stats.tsx:296-304`) e **antes** da cadeia de empty states — precisa aparecer
   inclusive quando `gearStats === []` (zero registros é o momento mais crítico).

## Detecção

- **Normalização compartilhada (uma vez por nota):** lowercase → strip de acentos
  (NFD) → tokenização em letras/números (`Chain`/`CHAIN`/`chain:` viram `chain`).
  **Case-insensitive é pedido explícito do proprietário (2026-11-11):** o `.includes`
  de hoje é case-sensitive e `Chain` passa batido; com a normalização ele registra.
  Acentos entram na mesma normalização para os sinônimos PT casarem com ou sem acento.
  Sem mangle de plural — o vocabulário é explícito (o registro por substring já
  resolve `pneus` ⊇ `pneu`).
- **Vocabulário:** todos os `id` de `Equipments` (EN) **+** sinônimos PT **curados** em
  `equipment.ts` (`SYNONYMS`), derivados das legendas (`caption`/`show`), só palavras
  distintivas — ex.: `chain`→`corrente`, `lub`→`lubrificação`, `review`→`revisão`,
  `clean`→`lavagem`, `tires`→`pneu`, `brakes`→`freio`, `saddle`→`selim`,
  `stem`→`mesa`. **Nunca** palavras genéricas (`par`, `de`, `frente` — ambígua entre
  pneu/roda/disco): com matching por substring, um sinônimo genérico casaria demais.
- **Registro preserva a semântica de substring (decisão do proprietário,
  2026-11-11):** a nota casa quando algum termo do vocabulário (id ou sinônimo) é
  **substring** da nota normalizada — igual ao `.includes` de hoje. Consequências
  diretas: `chainn` **registra** `chain` e **não reporta**, `lubrificacao` conta por
  conter `lub`, `pneus` conta por conter `pneu`; o que muda é só o que a normalização
  acrescenta (case e acento) e os sinônimos PT. O guard do `review`
  (`/\breview\b/` — `statistics.ts:245-253`) permanece e passa a valer para
  **todas as formas** do vocabulário de `review`: registrar `review` exige uma
  dessas formas **como palavra isolada** (`revisão` isolada passa a valer;
  `suspareview` sozinho continua não registrando `review`).
- **Classificação de cada token da nota (o que vira banner):**
  1. **Resolvido** — o token **gerou registro de verdade**: algum termo do
     vocabulário é substring do token (equivalente ao `.includes` da nota inteira,
     já que os termos são palavras contínuas) **e passou pelos guards do registro**
     (ex. o isolamento do `review`) → **registra e não reporta** — inclui as
     superstrings. Fecha a contradição que o builder check apontou: `reviewx` /
     `reviews` contêm `review`, mas o guard de isolamento **bloqueia o registro** →
     não são resolvidos → caem no near-miss e **são reportados** ("reviewx — você
     quis dizer review?"). O coletor usa o **mesmo** matching/guards do registro
     (função compartilhada): "resolvido" sempre significa "registrou", nunca
     "parecia bater".
  2. **Não resolvido próximo** — nenhuma substring com o vocabulário **e**
     **comprimento ≥ 4** **e** **Levenshtein ≤ 2** contra o pool completo (ids +
     sinônimos) → reporta `{ word, suggestion }` com a sugestão mais próxima
     (desempate: menor distância, depois ordem alfabética) — ex. `chian` → `chain`.
     Levenshtein de ~20 linhas local — **zero dependências novas**.
  3. **Texto livre** — não casou e não se parece com código (`treino`, `subida`) →
     silêncio. Sem esse filtro o banner viraria parede de falsos positivos.
- **Escopo idêntico ao da varredura atual:** só atividades com `*` no nome
  (`statistics.ts:181`), com `private_note` e cujo `gear_id` exista em `gears`
  (sem gear conhecido não há nome para a copy → descarta). Dedupe por
  `(activityId, word)`: duas atividades diferentes no mesmo dia com a mesma palavra
  geram **duas linhas** — são duas notas para corrigir e os links são distintos;
  texto idêntico é aceito e o progresso se vê pela contagem de linhas. Ordenação
  estável **data desc, depois word asc** (determina a renderização e a comparação
  da dispensa).
- **Payload:** `UnrecognizedCode = { activityId: number; gearName: string;
  startDate: string /* ISO; dd/MM/yyyy formatado no cliente */; word: string;
  suggestion: string }`.

## Banner (client)

- **Visibilidade:** `hasGear && hasActivities` **e existe algum caso com chave
  `activityId:word` fora do Set de dispensados** (Set começa vazio — recarregou o
  app → zera → volta, valendo "sempre que abrir o aplicativo e não estiver
  resolvido, aparece"). ✕ adiciona **todas** as chaves visíveis ao Set; um caso novo
  nunca esteve nele → volta na hora; **renomear a bike não reabre** (o Set guarda a
  identidade do caso, não o JSON do payload — falha que o builder check apontou no
  design anterior); todos os casos atuais dispensados → banner some. **Sem
  localStorage** — dispensa não é persistida. Mesmo molde do `alertedEquipmentIds`
  (`Stats.tsx:146`).
- **Estilo:** fundo `var(--gl-status-warning)` (token já existente, `globals.css:61`,
  precedente de fundo em `CardItem.module.css:108`), raio/bordas no molde dos cards.
  **Texto num token novo `--gl-text-on-warning: #1a1a1a` nos dois temas** (molde do
  `--gl-text-on-brand`, `globals.css:57/91`). Motivo medido com o `apca-w3` do
  repo: `--gl-text-primary` × warning **reprova no dark** (`#f0f0f0` × `#ffca28` =
  Lc 17,7), enquanto tinta escura passa folgada nos dois (Lc **73,2** no light, Lc
  **77,7** no dark). `--gl-status-warning` **não muda** (tem outros consumidores:
  `InitialInfo.module.css:89` como texto e `CardItem.module.css:108` como
  preenchimento). O par `--gl-text-on-warning` × `--gl-status-warning` (limiar 60,
  texto de corpo) **entra em `scripts/validate-color-contrast.mjs`** e fica verde no
  `lint:colors`.
- **Acessibilidade:** contêiner `role="status"` + `aria-live="polite"` (aviso, não
  alerta); ✕ é `<button>` com `aria-label="Dispensar aviso de código não
  reconhecido"`; link com foco visível, `target="_blank"` + `rel="noopener
  noreferrer"`; ícone de aviso `aria-hidden`.
- Data formatada `dd/MM/yyyy` no cliente; URL montada de
  `https://www.strava.com/activities/{activityId}`.

## Non-goals / anti-goals

- E-mail (Resend) — item futuro, opt-in/LGPD.
- Aceitar quase-códigos automaticamente — só reportar; quem erra corrige no Strava.
- Reportar superstrings (`chainn`, `chainh`) — **não** (decisão do proprietário:
  registram e ficam mudas); reportar palavra não resolvida que não se pareça com
  código — também não (só o quase-código a ≤2 edições).
- Nada de ML/heurística além de Levenshtein ≤ 2; sem dependência nova.
- Cap ou paginação de linhas (um banner por caso, sem teto — destinatário é uma
  pessoa; se aparecer muita linha, é bug do detector e o builder pode subir o corte).
- Nota com código válido em atividade **sem** `*` — falha silenciosa diferente, fora
  do D14.
- Mudar a convenção `*`, a semântica do caminho de cache ou o comportamento do
  webhook além do que já acontece.
- Persistir a dispensa; E2E (nenhum fluxo monta a modal do card, §8.13); alvos ≥44px
  → Fase D; toasts e editor de limite — intocados.
- Purge do `equipmentThresholds` no delete do atleta — **gap pré-existente** (os 4
  atuais de `webhook.ts:517-522` já não o incluem), fora do D14; fica como item à
  parte no plano local.

## Riscos registrados

1. **Limpeza pós-correção depende de sincronização:** o rebuild só roda quando as
   atividades mudam (`webhook.ts` nos eventos `update/create/delete`). Se o Strava não
   emitir evento de `update` para edição de `private_note`, o relato persiste até o
   próximo evento de qualquer atividade/atleta. Copy já diz "para atualizar aqui" — o
   atraso é de sincronização, não de detecção.
2. **As mudanças de registro são só duas:** (i) **case-insensitive** — notas com
   `Chain`/`CHAIN` passam a contar (pedido explícito; hoje era falha silenciosa);
   (ii) **sinônimos PT por substring** — o vocab curado sem palavras genéricas é o
   que segura falso positivo de registro. A semântica de superstring **não muda**:
   as fixtures existentes que casam por superstring continuam verdes sem ajuste.
3. **Falsos positivos:** palavra PT livre a ≤2 edições de um código ("pedais" →
   `pedal`) — mitigado por `len ≥ 4` + vocab curado sem palavras genéricas; na dúvida,
   o builder pode endurecer (ex.: exigir mesma letra inicial) e registrar aqui.

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/config/index.ts` | `REDIS_KEYS.unrecognizedCodes(athleteId)` |
| `src/services/equipment.ts` | exportar `SYNONYMS` (id → sinônimos PT curados) |
| `src/services/noteCodes.ts` **(novo)** | normalização/tokenização, vocabulário (ids+sinônimos), Levenshtein, `findNearMiss`, `collectUnrecognizedCodes(activities, gears)` |
| `src/services/statistics.ts` | matching sobre a nota normalizada — case-insensitive + sinônimos PT com substring preservado (~183-186); guard do `review` estendido às formas PT; `processStatistics` coleta e grava a chave (`redis.set` direto, best-effort, após salvar stats); backfill no cache path quando a chave não existe |
| `src/pages/api/dashboard.ts` | leitura em try/catch guardada por `hasGear && hasActivities` → `response.unrecognizedCodes` |
| `src/contracts/api.ts` | type `UnrecognizedCode` + campo opcional em `DashboardResponse` |
| `src/components/Stats.tsx` | estado (`codes`, Set de dispensados por `activityId:word`), escrita/leitura no `sessionStorage` + `CachedDashboard`, JSX do banner |
| `src/styles/globals.css` | token `--gl-text-on-warning: #1a1a1a` (light + dark) |
| `src/styles/components/Stats.module.css` | `.codesWarningBanner` (+ ícone, frases, link, ✕) |
| `src/pages/api/webhook.ts` | chave nova no `redis.del` do `delete` do atleta (`:517-522`) |
| `scripts/validate-color-contrast.mjs` | par `--gl-text-on-warning` × `--gl-status-warning` (limiar 60, os dois temas) |
| `tests/unit/services/note-codes.test.ts` **(novo)** | normalização, vocabulário, quase-códigos, coleta |
| `tests/unit/services/statistics.test.ts` / `statistics-flow.test.ts` | matching novo, gravação da chave (mock do `redis` — o `saveRemote` mockado no boundary não cobre), best-effort, backfill, cache intacto |
| `tests/integration/dashboard.test.ts` | presença/omissão do campo (chave, sem chave, falha de leitura, sem gear) |
| `tests/integration/webhook.test.ts` | `delete` do atleta limpa a chave nova |
| `tests/unit/components/stats.test.tsx` **(ou arquivo irmão)** | render do banner, copy, link, ✕, remount, lista nova, `sessionStorage` |

## Testes

| # | Caso | Asserção |
|---|---|---|
| 1 | normalização | `Chain`/`CHAIN`/`chain:`/`corrente` (acentos) → tokens esperados |
| 2 | registro | `troquei a corrente` registra `chain`; `revisão` isolada registra `review`; `Chain`/`CHAIN` registram (case-insensitive); `chainn` **registra** `chain` (superstring preservada) e **não** gera report; `suspareview` sozinho **não** registra `review`; `freios` registra `brakes` |
| 3 | coleta | `chian` → `{ word: 'chian', suggestion: 'chain', activityId, gearName, startDate }`; **`chainn` não reporta**; `reviewx` (guard de isolamento bloqueou o registro) **reporta** `review`; `troquei` (texto livre) **não** reporta; token `<4` não reporta; mesma palavra em 2 atividades do mesmo dia → 2 entradas; dedupe; ordem estável; atividade sem `*` e gear desconhecido fora |
| 4 | `processStatistics` | grava a chave nova via `redis.set` (**não** `saveRemote`); falha ao gravar relato → warn + stats salvas; falha ao gravar stats → throw como antes |
| 5 | cache + backfill | cache alinhado **com** chave → não toca (relato preservado); cache alinhado **sem** chave → varre `storedActivities` em mão, anexa nomes só se houver casos, grava uma vez (inclusive `[]`); gravação de backfill falhando não derruba o retorno |
| 6 | dashboard | chave com casos → campo presente; chave vazia/ausente/leitura falha → campo **omitido**; `hasGear`/`hasActivities` false → campo omitido |
| 7 | banner | render com copy exata + `href`/`target`/`rel`; ✕ esconde; remount (reload) volta; **caso novo reabre** sem reload; **rename de bike não reabre**; todos dispensados → some; com `gearStats` vazio ainda renderiza; sem casos → nada; cache do `sessionStorage` pinta na primeira renderização |
| 8 | gates | `yarn validate` + `yarn lint:colors` (par novo verde) + `yarn test:report` |
| 9 | LGPD | webhook `delete` do atleta limpa a chave nova (junto dos 4 atuais) |

**Gate final:** `yarn validate` + `yarn lint:colors` + `yarn test:report`. Sem E2E.

## O que fica para o builder

Preencher o mapa completo de `SYNONYMS` a partir das legendas de `equipment.ts`
(semente acima + o restante dos ~45 ids), nomear helpers/seletores de teste, ordem dos
casos, escolha do ícone de aviso (react-icons já é dependência), estender o guard do
`review` a todas as formas PT do vocabulário (isoladas), decidir se endurece o
quase-código (risco 3) registrando a decisão aqui — e mockar o `redis` nas unit tests
de statistics (`statistics-flow.test.ts` mockava só `saveRemote` no boundary; a chave
nova passa por outro import).
