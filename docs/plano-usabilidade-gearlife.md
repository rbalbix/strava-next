# Plano de Usabilidade — GearLife

> **Data:** 2026-10-06
> **Escopo:** análise profunda de usabilidade do usuário final, comparação com o mercado e roadmap de melhorias de alto valor e baixa intrusão.
> **Fontes:** código-fonte do repositório, `CONTEXT.md`, `Readme.md`, sites e documentação oficial de 11 concorrentes (consultados em 2026-10-06).

---

## Sumário executivo

O GearLife tem uma **proposta de entrada mais leve** do que a maioria dos concorrentes: não exige cadastro de peças — usa o Strava como fonte única de verdade e registra manutenção por código na nota privada da atividade. É um diferencial real de onboarding.

O problema está no **pós-valor**:

1. A mecânica central (código na nota privada + `*` no título) é **escondida** e tem **feedback quebrado** — a linha do componente *some da tela* logo após o usuário registrar a manutenção.
2. **Não existe notificação proativa** — o único alerta é um modal que só abre ao carregar o painel, deduplicado por cache da aba.
3. Vários defeitos **derrubam o funil**: primeira visita redireciona direto ao Strava sem mostrar valor; erro transitório da API **desloga o usuário em silêncio**; rate-limit não gera mensagem. O detalhamento do A1 (§2.D) revelou que o deslogamento do A2 passa por um **loop de reautenticação**: `signOut()` limpa a sessão, o app redireciona ao Strava, que emite novo token silenciosamente, e o usuário volta autenticado — com o cache de recuperação destruído. Consequência: **não existe caminho algum no app para revogar a sessão**.
4. O mercado evoluiu: previsão de vida útil, notificações multi-canal, múltiplos setups por bike, histórico com custos, integrações além do Strava. O GearLife hoje entrega **limites fixos (km ou h) + um modal**.

**Recomendação:** executar primeiro a Fase A (1–2 dias, conserta o funil), depois Fase B (ativação) e Fase C (retenção). Diferenciação de longo prazo: **registrar manutenção em 1 toque** e **PT-BR / mercado lusófono**, onde os principais concorrentes são todos em inglês.

---

## 1. Estado atual do produto

### 1.1 O que é

App web/PWA (+ Capacitor para iOS/Android) em Next.js 14 que:

- Autentica via OAuth do Strava e recebe **webhooks** em tempo real (`src/pages/api/webhook.ts`);
- Processa atividades e detecta manutenção pela **nota privada** (atividade com `*` no nome é inspecionada; códigos como `chain,lub` são buscados por substring);
- Calcula distância/tempo acumulado desde a última manutenção por componente;
- Permite definir **limites por km ou horas** por componente/bike (chave Redis `strava:equipment-thresholds:<athleteId>`);
- Mostra alerta modal ao abrir o painel quando algum limite foi atingido.

### 1.2 Mapa da interface

| Rota / Componente | Arquivo | Papel |
|---|---|---|
| `/` | `src/pages/index.tsx` | Única "página do app": redireciona ao OAuth sem cookie; com cookie renderiza `<Stats/>` |
| `/como-funciona`, `/faq`, `/privacidade`, `/contato` | `src/pages/*.tsx` | Páginas públicas (inalcançáveis a partir do app logado) |
| Dashboard | `src/components/Stats.tsx` | Pilha de cartões por gear + empty states + alerta de limite |
| Cartão da bike | `src/components/Card.tsx` | `<button>` inteiro → abre detalhe |
| Detalhe da bike | `src/components/CardDetailModal.tsx` | 3 `StatCard` + timeline de componentes + editor de limite |
| Linha de componente | `src/components/CardItem.tsx` | Barra de progresso + editor inline + **cópia para clipboard** |
| Alerta de limite | `src/components/ThresholdAlertModal.tsx` | Abre automaticamente quando há itens `overdue` novos |
| Ajuda / tabela de códigos | `HowItWorksContent.tsx`, `ComponentInfo.tsx` | Só acessíveis pelo menu lateral |
| Sidebar | `src/components/Sidebar.tsx` | Drawer flutuante de 220px (bloco "Sair" **comentado**) |

### 1.3 Fluxo real do usuário

```
/ (sem cookie) → /api/oauth/start → Strava → /api/authorize → /
  → <Stats/> → cartão da bike → CardDetailModal → linha do componente → editor de limite (3-4 cliques)
```

---

## 2. Achados de usabilidade — priorizados

### 🔴 Crítico (quebra o fluxo principal)

#### A1. Primeira visita = redirect automático para o Strava
- **Onde:** `src/pages/index.tsx:103-110`.
- A branch de landing (`index.tsx:40-76`: logo, tagline, "Entrar com Strava", links de privacidade) **não é alcançável em produção** — nem após logout (`AuthContext.tsx:116` → `router.replace('/')` → redirect de novo).
- **Impacto:** o usuário nunca vê o valor do produto nem o aviso LGPD ("o que vamos ler da sua conta") antes de autorizar. Perda de conversão e de confiança.
- **Evidência colateral:** o teste E2E `scripts/e2e-ui.mjs:28` espera `h1:text("GearLife")` numa página que não tem `<h1>` e que redireciona — sinal de que o fluxo testado não é o fluxo real.
- **Detalhamento completo (inclui o loop de reautenticação do `signOut()`, `ErroMsg` morto e a causa raiz):** ver §2.D.

#### A2. Erro transitório da API desloga o usuário em silêncio
- **Onde:** `Stats.tsx:234-242` + `AuthContext.tsx:90-117`.
- Qualquer `isError` (timeout, 500, rede caindo) sem cache no sessionStorage chama `signOut()` → limpa tudo → `router.replace('/')` → redirect ao Strava.
- **Impacto:** o usuário é **expuldo do app sem explicação** por falha que não é dele. Com 401, deslogar é correto — mas igualmente silencioso.
- **Confirmado (2026-10-28):** com falha persistente (429) o ciclo não termina — ver §2.D.2 item 3. Sem cache, cada volta do round-trip apaga mais um degrau de recuperação.

#### A3. Erros e rate-limit (429) não geram mensagem alguma
- **Onde:** `ErroMsg.tsx:11-25` exige `status === 429`, mas `src/lib/apiClient.ts:14-16` lança `new Error('Request failed: HTTP 429')` **sem** a propriedade `status`. E `ErroMsg` só existe na branch de landing inalcançável (A1).
- **Agravante de rate-limit:** `useAutoSync` (`src/hooks/useAutoSync.ts:10-15`) faz polling a cada 5s; cada `/api/app/dashboard` chama ≥3 endpoints do Strava (`dashboard.ts:39-46` — `getAthlete`, `getAthleteStats`, `verifyIfHasAnyActivities`). **~36 chamadas/min por aba aberta**, contra limite de 300/15min. Uma aba esquecida aberta estoura o quota → volta ao A2/A3.

#### A4. Componente recém-registrado some da tela e fica impossível de configurar
- **Onde:** `src/services/statistics.ts:255-261` (`equipments` só contém eventos registrados), `CardItem.tsx:87,152` (retorna `null` quando `distance===0 && movingTime===0`), `CardDetailModal.tsx:221-310` (sem empty state).
- **Sequência real:** usuário marca `chain` na pedalada → webhook zera o contador → linha da corrente **desaparece** do modal → nenhum toast de confirmação → impossível definir limite dela até a próxima corrida.
- **Impacto:** o momento exato em que o usuário testa a mecânica central é o momento em que o app parece **não ter funcionado**. Provavelmente o achado de maior impacto relativo.

#### A5. Sem logout na UI
- **Onde:** `Sidebar.tsx:303-320` (bloco "Sair" comentado) × `faq.tsx:30-34` ("Você pode sair da sessão no app").
- Contradição direta com a documentação; usuário em compartilhamento de dispositivo não consegue encerrar a sessão.
- **⚠️ Não é corrigível reativando o botão:** mesmo existindo, o `signOut()` entra em loop de reautenticação (ver §2.D.2). O caminho é: (1) quebrar o loop impondo a restrição do **D5** (nunca `signOut()` em erro transitório); (2) decidir se o produto quer logout — construí-lo de fato — ou não quer — e aí corrigir o `faq.tsx:30-34`.

### 🟠 Alto

#### B1. Onboarding da mecânica central escondido
- A instrução ("escreva o código em OBSERVAÇÕES PRIVADAS e ponha `*` no título") existe em `ComponentInfo.tsx:61-66` e `HowItWorksContent.tsx:210-216`, mas só pelo menu lateral.
- Nada abre automaticamente na primeira execução (`ModalContainer` só renderiza se `activeModal` estiver setado).
- `CardDetailModal` com lista vazia renderiza `<ul>` sem nada (`CardDetailModal.tsx:221-310`) — **quem mais precisa de ajuda vê tela muda**.
- Instrução obsoleta: `HowItWorksContent.tsx:229-234` manda clicar no ícone do rodapé, mas o `Footer` está comentado (`index.tsx:152`).

#### B2. Loading infinito
- `Stats.tsx:287-301`: se `hasGear && hasActivities` mas `gearStats` fica vazio (bike nova sem km, atividades sem gear), o usuário vê "Aguarde. Carregando suas estatísticas..." + skeletons **para sempre**. Sem timeout, sem mensagem de erro.
- Agravante: os skeletons usam `rgba(var(--gl-text-primary), 0.1)` com variável `#hex` dentro de `rgba()` (`Stats.module.css:44-46`) → declaração **inválida, descartada pelo browser** → skeleton sem fundo.

#### B3. Nenhuma notificação proativa
- Único mecanismo: `ThresholdAlertModal` ao carregar o painel, deduplicado por cache da aba (`Stats.tsx:163-171`). Quem já tem a aba aberta nunca vê; quem recarrega com cache não repete.
- O `HowItWorksContent.tsx:140-142` **promete** "alerta logo após fazer login", promessa não cumprida de forma confiável.
- E-mails (`Resend`) existem mas vão **só para o admin** (`webhook.ts:298-310`). O service worker (`public/sw.js`) só faz cache — nenhuma ocorrência de `Notification`/`pushManager`.
- **Todos os concorrentes oferecem notificação** (push, e-mail ou desktop). É a feature que define a categoria: *"Receive maintenance notifications"* é o headline do ProBikeGarage.

#### B4. Barra de progresso sem número
- Rótulo interno removido (`CardItem.module.css:89-96`); valor existe só em `aria-valuetext` (`CardItem.tsx:115`).
- O usuário vê **apenas uma cor** — não sabe se está em 5h de 10h ou 9,5h de 10h. Leitura por cor pura, inacessível e ambígua.

#### B5. Cópia silenciosa e com data errada
- Clicar na linha do timeline copia o evento sem avisar (`CardItem.tsx:60-67`; toast de feedback **comentado** na linha 62).
- `copyEventDetailsToClipboard` usa `new Date()` (data de **hoje**) em vez da data do evento (`src/utils/clipboard.ts:41`) — o que é copiado pode estar factualmente errado.

#### B6. Falha ao carregar limites é engolida
- `CardDetailModal.tsx:57-59`: `.catch(() => { /* ignore */ })`. O usuário pode abrir o editor achando que não há limite salvo e **sobrescrever o existente**.
- `saveThreshold` (`CardDetailModal.tsx:87-110`) não desabilita o botão nem mostra spinner → duplo clique envia 2 requisições; toast dura só 2s e não pode ser fechado manualmente.

### 🟡 Médio

| ID | Problema | Onde |
|---|---|---|
| C1 | Sem `<h1>`/`<h2>` no dashboard (nome da bike é `<div>`); múltiplos `<main>` simultâneos; `<button>` envolvendo `<header>`/`<main>` | `Card.tsx:48-84`, `Stats.tsx:257` |
| C2 | Foco invisível no botão fechar (`outline:none` sem substituto); links do sidebar focáveis com `aria-hidden` (painel usa `opacity:0`, não `visibility:hidden`) | `CardDetailModal.module.css:60-62`, `Sidebar.module.css:10-11`, `Sidebar.tsx:155` |
| C3 | Contraste falho **fora** do gate (o script valida só 6 pares): `#ffa000` sobre `#fcfcfc` ≈ 2:1 no texto de ajuda; `#fac037` ≈ 1,6:1; gate aprova Lc mínimo 27 para texto | `InitialInfo.module.css:54-57,84-86`, `scripts/validate-color-contrast.mjs:10-17` |
| C4 | Scrollbars ocultas globalmente — sem pista de conteúdo rolável | `globals.css:16-22,165-172`, `ModalContainer.module.css:25-35` |
| C5 | Mobile descuidado (pendência do próprio README): alvos de toque ~34px no editor de limite, `--header-height` **nunca definido**, sem bottom-nav, sidebar de 220px em vez de drawer, sem nenhum teste E2E em viewport mobile | `CardDetailModal.module.css:130,156`, `Header.module.css:12,25`, `Readme.md:362` |
| C6 | Sem busca/ordenação/filtro de equipamentos; ordem crua do Strava (`[...bikes, ...shoes]` — tênis aparece como "gear"); bike com 0km some sem aviso | `src/services/gear.ts:17-21`, `statistics.ts:273-285` |
| C7 | IDs crus na UI (`suspareview`, `bb`, `stis`) e legendas PT/EN misturadas ("suspa revisada a:", "shock", "freehub") | `src/services/equipment.ts`, `ComponentInfo.tsx:75-91` |
| C8 | Idioma/marca inconsistentes: tagline EN "Monitor your gear. Ride smarter.", marca antiga **"Stuff Stats"** nos e-mails, `offline.html` sem acentos, 404 do Next em inglês (redirect de falha de OAuth, `authorize.tsx:74`) | `index.tsx:44`, `email.ts:61,70,127,135` |
| C9 | `/faq`, `/privacidade`, `/contato` inalcançáveis do app logado; versão "v0.3.0" exposta ao usuário | `index.tsx:152`, `PublicPageNav.tsx` |
| C10 | Alerta `overdue` dependente do cache da aba; sem histórico de alertas, sem snooze, sem preferência | `Stats.tsx:144,163-171` |
| C11 | README com typos e desatualizado na tabela de códigos (`breaks`/`brakes`, "Front brak pad"; faltam `suspareview`, `shockreview`, `calipers`, `stis`…) — é a referência pública do usuário | `Readme.md:35-79` |
| C12 | CSS morto gera manutenção e risco | `Home.module.css:186-235`, `CardItem.module.css:127-248` |

### Pontos fortes (manter)

- Focus trap + restauração de foco + Escape nos modais e sidebar (`ModalContainer.tsx:62-174`, `Sidebar.tsx:38-128`), com scroll-lock sem "pulo".
- `role="progressbar"` completo com `aria-valuetext` na unidade certa (`CardItem.tsx:108-116`), com teste dedicado.
- `radiogroup`/`radio` navegável por setas no seletor km|h (`CardDetailModal.tsx:272-295`).
- Toast com `role="alert"`/`aria-live` adequados (`Toast.tsx:9-14`).
- Gate de contraste APCA no CI (`yarn lint:colors`).
- `ThresholdAlertModal` com 7 breakpoints, `prefers-reduced-motion` e alvos de toque 44px — o componente mais cuidado do projeto.
- 99,68% de cobertura de linhas / 100% de funções; `yarn validate` completo.
- Limites corretamente isolados por `gearId` e deduplicação de alerta por `gearId:equipmentId`.

---

## 2.D Detalhamento aprofundado — A1

> Primeira visita = redirect automático para o Strava. Ao detalhar o item apareceram **quatro defeitos encadeados**, incluindo um loop de reautenticação no caminho de erro que não constava do plano original.

### 2.D.1 A cadeia de redirecionamento hoje

```
Usuário abre https://app.gearlife.com/
        │
        ▼
src/pages/index.tsx:81-110  (getServerSideProps)
  lê cookies strava_code e strava_athleteId
  if (!code || !athlete_id)  →  return { redirect: '/api/oauth/start' }   ← linha 103-110
        │
        ▼
src/pages/api/oauth/start.ts:23
  cria strava_oauth_state (randomBytes(24))  +  res.redirect(authorizeUrl)
        │
        ▼
Strava  (approval_prompt=auto — Readme.md:134)
  • 1ª vez: mostra tela de consentimento "GearLife quer ler suas atividades"
  • Já autorizado antes: redireciona de volta silenciosamente, sem tela alguma
        │
        ▼
src/pages/api/authorize.tsx:52-69
  grava strava_code + strava_athleteId (HttpOnly, 30 dias) → res.redirect('/')
        │
        ▼
/  →  getServerSideProps agora acha cookies  →  renderiza <Stats/>
```

O ponto central: **`getServerSideProps` não tem estado "visitante"**. A única alternativa ao redirect é "já autenticado". Não existe o meio-termo "pessoa chegou e ainda não decidiu".

### 2.D.2 🔴 `signOut()` entra em loop de reautenticação quando invocado pelo caminho de erro

> **Nota de enquadramento:** não existe botão de logout na UI — o bloco "Sair" está comentado (`Sidebar.tsx:303-320`) e a ausência de logout parece uma decisão intencional do produto. Este achado **não é** sobre reativar esse botão. É sobre `signOut()` continuar sendo **código vivo**, invocado pelo caminho de erro do dashboard — que é alcançado em produção hoje.

**Onde `signOut()` é realmente chamado** (único ponto alcançável sem UI de logout):

```
src/components/Stats.tsx:234-242
  } else if (isError) {
      setErrorInfo(isError);
      if (isError.message.includes('401')) { signOut(); }   // linha 238
      else if (!readCachedDashboard())     { signOut(); }   // linha 240
  }
```

O que `signOut()` faz (`AuthContext.tsx:90-117`):

```ts
await apiClient.logout();                    // POST /api/logout → limpa cookies HttpOnly ✅
document.cookie = 'strava_code=; Max-Age=0'; // ❌ no-op: o cookie é HttpOnly (cookies.ts:15)
sessionStorage.removeItem('gearStats', ...)  // ❌ destrói o cache que o A2 usaria para recuperar
router.replace('/');                          // → getServerSideProps → sem cookie
```

Aí `index.tsx:103` redireciona para `/api/oauth/start` → Strava com `APPROVAL_PROMPT=auto` → **o Strava reconhece que a app já foi autorizada, não mostra tela nenhuma e emite um novo `code`** → `/api/authorize` grava cookies novos → volta logado.

**Resultado: o round-trip não termina em "deslogado" — termina em "logado de novo, com o cache zerado".**

**Por que isso importa (e por que não é sobre o botão):**

1. **É o mecanismo do A2**, não um achado separado. O A2 descreve o sintoma ("erro transitório desloga o usuário em silêncio"); isto é o que *acontece* durante esse deslogamento.
2. **Destrói a saída elegante**: o `removeItem` de `sessionStorage` apaga o cache que faria o app exibir dados antigos em vez de expulsar o usuário.
3. **Loop mantido com rate-limit — CONFIRMADO por análise de cadeia de código** *(verificado em 2026-10-28; não reproduzido em ambiente com Strava real, porque depende do quota efetivo da API, mas todos os degraus do ciclo existem e são alcançáveis)*:

   | # | Degrau | Evidência |
   |---|---|---|
   | 1 | 429 chega ao efeito de erro; mensagem `Request failed: HTTP 429` não contém `'401'` | `apiClient.ts:14-16` (antes da correção) |
   | 2 | Cai no `else` de "sem cache" → `signOut()` | `Stats.tsx:240` |
   | 3 | `signOut()` apaga exatamente as chaves que `readCachedDashboard()` lê — o cache fica nulo | `AuthContext.tsx:99-105` × `Stats.tsx:84-125` |
   | 4 | `router.replace('/')` remonta a árvore → `getServerSideProps` sem cookies | `AuthContext.tsx:116`, `index.tsx:103-110` |
   | 5 | Redirect a `/api/oauth/start` → Strava com `APPROVAL_PROMPT=auto` → reemissão silenciosa → cookies novos → volta logado | `oauth/start.ts:23`, `authorize.tsx:52-59` |
   | 6 | `Stats` monta, SWR (`refreshInterval: 5000`, sem `errorRetryCount`) refaz o fetch | `useAutoSync.ts:11-15` |
   | 7 | O quota é por atleta+app em janela de 15 min, não por sessão → segue 429 → volta ao degrau 1 | API do Strava |

   O ciclo não é interrompido por nada: não há contador de tentativas, não há backoff, e o degrau 3 garante que a cada volta o cache de recuperação esteja ainda mais vazio. Fecha-se apenas quando o usuário fecha a aba.

   **Status desta verificação:** confirmado. Era a hipótese de maior impacto e a de menor visibilidade do detalhamento.
4. **Compliance:** não existe caminho nenhum no app para revogar consentimento. O único logout real é o atleta deletar a conta no Strava (webhook `athlete/delete`, `webhook.ts`). Para a LGPD isso precisa estar explícito na `/privacidade` — e não está.

**Consequência para o plano:** a correção não é "descomentar o botão". É a restrição sobre o **D5**: `signOut()` só pode ser chamado em 401 confirmado, **nunca** em erro transitório. É isso que quebra o loop. O A5 (`faq.tsx:30-34` afirma "Você pode sair da sessão no app") passa a ser uma decisão de produto separada: ter logout (e construí-lo) ou não ter (e corrigir o FAQ) — nos dois casos, depois de quebrar o loop.

### 2.D.3 O que fica invisível em produção

A branch de landing (`index.tsx:40-76`) é **código morto em produção**. Tudo que ela renderiza nunca aparece:

| Elemento | Linha | O que se perde |
|---|---|---|
| `<ErroMsg />` | `index.tsx:42` | Mensagem de rate-limit (429). Ver 2.D.4. |
| `<h2>Monitor your gear…</h2>` | `index.tsx:44` | Único título da home — **e está em inglês**, enquanto o resto é PT-BR |
| `Conecte sua conta Strava…` | `index.tsx:45-47` | Explicação do valor |
| CTA "Entrar com Strava" | `index.tsx:54-60` | O usuário nunca escolhe entrar — é empurrado |
| CTA "Como funciona" | `index.tsx:61-68` | **A porta de entrada para o onboarding some** — ver 2.D.5 |
| `appVersion` | `index.tsx:72-74` | (bom que some: informação de dev) |
| `<SeoHead title='GearLife \| …'>` | `index.tsx:143-147` | Ver 2.D.6 |

### 2.D.4 Por que o `ErroMsg` (429) é morto-nascido

Duas camadas de defeito se empilham:

1. **`ErroMsg` só existe na branch de landing** (`index.tsx:42`) → inalcançável (2.D.3);
2. Mesmo se fosse alcançável, seu critério **nunca é verdadeiro**:

```ts
// ErroMsg.tsx:11-16
const status = ('status' in codeError) ? codeError.status : undefined;
// ErroMsg.tsx:19
if (status === 429 && ...)
```

mas `src/lib/apiClient.ts:14-16` lança `new Error('Request failed: HTTP 429')` — **sem a propriedade `status`**. `'status' in err` é `false` → `status` é `undefined` → `ErroMsg` retorna `null`.

Os testes passam porque injetam `{status: 429}` literalmente (`tests/unit/components/misc-components.test.tsx:105-131`): **o teste valida um objeto que o código nunca produz**. É o tipo de falso positivo que só se descobre em produção.

Combinado com o A3 (polling de 5s × ≥3 endpoints do Strava), o cenário real é: usuário deixa a aba aberta → estoura 300/15min → **nada aparece** → e, se o erro chegar sem cache, o A2 o desloga.

### 2.D.5 A porta do onboarding está trancada por dentro

A mecânica central do produto — "ponha `*` no título e o código na nota privada" — está documentada em dois lugares:

- `ComponentInfo.tsx:61-66` (modal "Componentes")
- `HowItWorksContent.tsx:210-216` (modal "Como funciona" / página `/como-funciona`)

Ambos acessíveis **apenas pelo sidebar**, que só existe **depois** do login. E a landing, que tinha um botão "Como funciona" (`index.tsx:61-68`), é inalcançável.

**Resultado:** o usuário autoriza no Strava sem ter lido uma linha sobre o que o app fará, cai num dashboard vazio (`CardDetailModal.tsx:221-310` renderiza `<ul>` sem empty state) e **não existe caminho algum para descobrir como usar o produto**, a não ser explorar o menu.

Pior: `HowItWorksContent.tsx:229-234` instrui "clique no ícone `<FaMedapps/>` que fica no final da lista de equipamentos" — mas o `Footer` está **comentado** (`index.tsx:152`). Ou seja, **toda instrução de uso do app aponta para um elemento que não existe**.

### 2.D.6 Impacto colateral em SEO e confiança

- O `SeoHead` da home (`index.tsx:143-147`) só é renderizado **com cookies**. Um crawler sem cookies recebe 302 → `/api/oauth/start` → Strava. Combinado com `src/pages/robots.txt.ts` e `sitemap.xml.ts` existindo, o site **anuncia-se ao Google e redireciona o Google para o Strava**. Título e description da home nunca são indexados.
- **Conversão:** o usuário nunca vê o argumento de valor nem o aviso "o que vamos ler da sua conta" antes de ceder acesso às atividades. Ruim para conversão *e* para percepção de transparência (LGPD pede consentimento informado — Art. 8º; hoje o consentimento é obtido antes de qualquer explicação do app).

### 2.D.7 O E2E prova que o fluxo testado não é o fluxo real

`scripts/e2e-ui.mjs:25-28`:

```js
await page.goto(baseUrl, ...);
await expectVisible(page, 'h1:text("GearLife")', 'Home heading not found.');
```

Espera um `<h1>` que **não existe em lugar nenhum do componente** (a landing tem `<h2>` na linha 44, e o nome da bicicleta é um `<div>` em `Card.tsx:54-55`). Num navegador real, `page.goto('/')` dispara o redirect → Strava → falha de rede/timeout no CI. O teste só "passa" porque a CI roda apenas `test:e2e:smoke:ci` (`Readme.md:302`), que valida que o server sobe.

### 2.D.8 Causa raiz: não existe conceito de sessão

Agravante técnico que sustenta tudo isso — `strava_code` **é o code de troca do OAuth (uso único) armazenado como cookie de sessão** (`authorize.tsx:53`):

```ts
serializeHttpOnlyCookie('strava_code', code, { maxAge: SESSION_MAX_AGE /* 30 dias */, ... })
```

O app trata a presença desse cookie como "está logado". Não há token de sessão próprio, nem verificação contra Redis. Consequências:

- `index.tsx:102` decide o redirect por uma **variável de um uso só**;
- `strava_athleteId` **não é verificado contra nada** — é um número vindo do cliente (a autenticação real fica no Redis via `strava:auth:<athleteId>`);
- `document.cookie = 'strava_code=; Max-Age=0'` (`AuthContext.tsx:108-109`) é **no-op silencioso**, porque o cookie é HttpOnly (`cookies.ts:15`) e invisível para JS. A limpeza de sessão depende, portanto, exclusivamente do `POST /api/logout` — e ainda assim o round-trip do 2.D.2 **recria a sessão imediatamente a seguir**.

**Conclusão:** A1 não é um bug de UX isolado — é o sintoma visível de uma autenticação sem sessão. Corrigir só o redirect sem tocar nisso mantém o round-trip de reautenticação do 2.D.2.

### 2.D.9 Solução proposta

#### Opções avaliadas

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| **A. Landing + query param de intenção** *(recomendada)* | `getServerSideProps` para de redirecionar; renderiza landing. Só redireciona se `?login=1` ou se a sessão existe. | Simples, reversível, mantém SSR | Precisa ajustar o E2E |
| B. Sessão real + redirect condicional | Criar cookie `gl_session` (token opaco validado no Redis) e redirecionar só sem sessão | Corrige a causa raiz (2.D.8) | Escopo maior, toca em toda a auth |
| C. Manter redirect e criar `/bem-vindo` | Rota intermediária antes do OAuth | Menor mudança no `index.tsx` | Mais um hop; continua escondendo a landing |

**Recomendo A + o núcleo de B** (trocar o cookie `strava_code` por um `gl_session` opaco), em dois PRs separados para permitir rollback.

#### Detalhamento da Opção A (+ sessão)

**PR 1 — Landing acessível (~1 dia)**

| Arquivo | Mudança |
|---|---|
| `src/pages/index.tsx:102-110` | Substituir o redirect incondicional por: ler `gl_session`; se existir → props com `authenticated: true`; senão → **renderizar landing**. Remover o uso do `strava_code` como sinal de sessão. |
| `src/pages/index.tsx:44` | Trocar `Monitor your gear. Ride smarter.` por tagline PT-BR (ex.: **"Pedale. A gente cuida da manutenção."**) |
| `src/pages/index.tsx:54-60` | CTA `Entrar com Strava` → `/api/oauth/start?intent=login` |
| `src/pages/index.tsx:61-68` | CTA "Como funciona" → **link para `/como-funciona`** (a página existe e é boa; hoje só é alcançada pelo sidebar) |
| `src/components/PublicPageNav.tsx` | Torná-lo visível também na landing (hoje só nas páginas públicas) |
| `src/pages/404.tsx` | **Criar** — `authorize.tsx:74` redireciona para `/404` inexistente (hoje cai no 404 default do Next, em inglês) |
| `src/pages/api/oauth/start.ts` | Aceitar `?intent=login` para saber se o redirect de retorno deve ir ao dashboard ou à landing com toast de sucesso |
| `src/contexts/AuthContext.tsx:108-109` | Remover as duas linhas de `document.cookie` — no-op (o cookie é HttpOnly) e **código que simula uma capacidade que não existe**. Limpeza, não conserto. |
| `src/components/SeoHead` / `robots.txt.ts` | Permitir indexação da landing; manter `noindex` nas rotas autenticadas |

**PR 2 — Sessão real (1–2 dias)**

| Arquivo | Mudança |
|---|---|
| `src/pages/api/authorize.tsx:52-59` | Deixar de gravar `strava_code` como cookie; gerar `gl_session` = token opaco (`randomBytes(32)`) gravado em Redis (`strava:session:<hash>` → `athleteId`, TTL 30d) |
| `src/pages/index.tsx:81-100` | Validar `gl_session` no Redis (não mais confiar em `strava_athleteId` vindo do cliente) |
| `src/pages/api/logout.ts` | Apagar a chave do Redis além de limpar o cookie |
| `src/server/cookies.ts` | Padronizar `SameSite=Lax` (hoje `authorize` grava com `Lax` e `logout` limpa com `Strict` — inconsistente) |

#### Edge cases a cobrir

1. **Usuário logado digitando `/`** → dashboard, sem passar pela landing.
2. **Encerramento de sessão** (se o D7 resultar em logout real) → landing + toast "Você saiu". **Sem loop**: sem sessão, sem redirect. Se o D7 resultar em "sem logout", este caso não existe — mas o FAQ precisa parar de prometê-lo.
3. **Falha no Redis durante validação** → tratar como "sem sessão" (landing), nunca como redirect infinito.
4. **PWA/Capacitor** (`CAPACITOR_SERVER_URL`): o redirect cego hoje significa que o ícone do app abre direto no Strava. Com a landing, o ícone abre mostrando o produto. Ganho específico para o app nativo.
5. **Deep link `/` de dentro do app nativo** → idêntico ao caso 4.
6. **Estado OAuth perdido** (`strava_oauth_state` expirou, 600s) → `authorize.tsx:25-31` responde 400 JSON cru. Melhor: redirect para a landing com `?erro=expirado` e mensagem PT-BR.

#### Testes a ajustar

| Teste | Mudança |
|---|---|
| `tests/unit/pages/home-page.test.tsx:28-43` | Passa a ser o caso **padrão** (landing sem cookie), não mais um caso manual |
| Novo | Landing renderiza sem cookies; CTA aponta para `/api/oauth/start`; link "Como funciona" aponta para `/como-funciona` |
| Novo | Com `gl_session` válido → `<Stats/>`; com sessão inválida/expirada → landing, **sem loop** (asserção de que não há redirect) |
| `scripts/e2e-ui.mjs:28` | Trocar `h1:text("GearLife")` por um seletor real da landing — **melhor ainda: adicionar um `<h1>` à landing**, que hoje não tem nenhum |
| `tests/unit/components/misc-components.test.tsx:105-131` | Acrescentar o caso real: `apiClient` lança `Error` com `status` → `ErroMsg` aparece |

#### Critérios de aceite

- [ ] Abrir `/` sem cookies **não** dispara nenhum redirect; a landing renderiza com `<h1>` em PT-BR.
- [ ] O Strava só é acionado por clique explícito em "Entrar com Strava".
- [ ] Um erro transitório no dashboard **não** dispara round-trip ao Strava (nenhuma chamada a `/api/oauth/start` sem clique, verificável no E2E com intercept de requisições).
- [ ] Usuário logado digitando `/` cai direto no dashboard.
- [ ] `/como-funciona`, `/faq` e `/privacidade` são alcançáveis **antes e depois** do login.
- [ ] Nenhum redirect `/` → `/api/oauth/start` → Strava sem interação (verificável no E2E com intercept de requisições).
- [ ] `yarn validate` e `yarn lint:colors` verdes.

### 2.D.10 Esforço e risco

| PR | Esforço | Risco | Rollback |
|---|---|---|---|
| 1 — Landing acessível | ~1 dia | Baixo (mudança de renderização + um redirect condicional) | Reverter o `index.tsx` |
| 2 — Sessão real | 1–2 dias | Médio (migração de cookie; usuários existentes têm `strava_code`, não `gl_session`) | Fallback: aceitar `strava_code` por 30 dias como transição |

**Migração:** no PR 2, aceitar temporariamente o cookie antigo `strava_code` como sessão válida, para não deslogar a base existente. Remover em release seguinte.

### 2.D.11 Conclusão do detalhamento

A1 parece um detalhe de UX ("mostrar a landing antes do login"), mas ao detalhar aparecem **quatro defeitos encadeados**: `signOut()` em loop de reautenticação pelo caminho de erro (2.D.2), `ErroMsg` morto em duas camadas (2.D.4), porta do onboarding trancada (2.D.5) e uma autenticação que usa um code de uso único como sessão (2.D.8).

**Ressalva de prioridade:** para o usuário, o núcleo de A1 é 2.D.5 — a landing escondida e o onboarding trancado por dentro. O loop do 2.D.2 é um achado **técnico**: não existe botão de logout para o usuário apertar, então ninguém experimenta esse defeito de forma direta. Ele importa por dois motivos — é o mecanismo que materializa o A2, e impõe uma restrição obrigatória sobre o D5 — e não por ser um bug perceptível na interface. **Sua variante pior (loop sustentado por 429) foi confirmada por análise de cadeia em 2026-10-28** (§2.D.2, item 3), o que torna D5 uma correção obrigatória e não uma melhoria defensiva.

A correção da landing (PR 1) continua sendo a de menor custo e maior retorno, e é independente de tudo isso.

---

## 3. Comparação com o mercado

### 3.1 Panorama (consultado em 2026-10-06)

O segmento "bike maintenance tracker" amadureceu: ao menos **11 produtos diretos** disputam o mesmo usuário. Todos — exceto WatchMy.bike, que adiciona showcases públicos — resolvem o núcleo "km por componente + alerta de manutenção".

| Produto | Plataforma | Strava | Outras integrações | Notificação | Preço |
|---|---|---|---|---|---|
| **ProBikeGarage** | iOS, Android, Web | ✅ (webhook em tempo real; auto-sync diário no Premium) | — | push + e-mail + desktop | Free + Premium **US$2,99/mês** (US$24,99/ano) |
| **Componentry** | iOS, Android, Web | ✅ | **Garmin, Wahoo, Hammerhead** (único com os 4) | push, lembretes por nº de pedaladas | **US$4/mês**, sem free tier |
| **WatchMy.bike** | PWA (web) | ✅ (webhook + backup a cada 6h) | — | push nativo, e-mail, desktop (customizável no Alloy) | Free (3 bikes) + **€39/ano** |
| **Geer** | PWA | ✅ | — (roadmap Garmin/Wahoo) | push + e-mail | Free (2 bikes, 5 peças) + **€2/mês** |
| **mainTrack** | iOS (desde 2019) | ✅ | — | push | **Gratuito**, sem assinatura |
| **BikeCare** | — | ✅ | — | push + e-mail configuráveis, snooze | Free (1 bike) + Pro |
| **Velo Buddy** | iOS, Android | ✅ | export de Garmin/Wahoo | ✅ | US$4,99/mês |
| **Bikerly** | Web | ✅ | — | ❌ (alertas ainda em roadmap) | Free com anúncios + £4,99 único |
| **Keepbike** | — | ✅ | — | e-mail + push | — |
| **Strava My Gear** | Web (nativo) | — | — | **❌** (sem alertas; 1 componente por tipo) | Free / ~€12/mês |
| **Garmin Connect** | Web + head unit | — | nativo | no head unit | Free |
| **GearLife** | Web + PWA + Capacitor | ✅ webhook em tempo real | — | **❌ modal só ao abrir o painel** | **Gratuito, PT-BR** |

### 3.2 Tabela capacidade a capacidade (núcleo)

| Capacidade | ProBikeGarage | Componentry | WatchMy.bike | Geer | mainTrack | Strava | **GearLife** |
|---|---|---|---|---|---|---|---|
| Registro de manutenção **dentro do app** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ (só nota privada no Strava) |
| Previsão de vida útil (km **e dias**) | ❌ (intervalo fixo) | ✅ preditivo | ✅ | ✅ (contagem regressiva) | ❌ (meta fixa) | ❌ | ❌ |
| Métricas de intervalo | km, moving, elapsed, nº de pedaladas, *elevation* (Premium) | km, tempo, nº de pedaladas | km, tempo | km, tempo | período, uso, nº de pedaladas, elapsed | km | **km ou horas** |
| Peso por condições (chuva, superfície, elevação) | ❌ | ✅ (modelo preditivo) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Múltiplos setups por bike (indoor/estrada, corrida, commute) | ✅ | ✅ (bike profiles) | ✅ (por tipo de atividade + `#tag`) | ✅ (indoor/outdoor/both) | ❌ | ❌ | ❌ |
| Agrupamento de componentes | ✅ | ✅ | ✅ | — | ❌ | ❌ | parcial (regras fixas em código) |
| Swap entre bikes preservando histórico | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Histórico de serviços com custos | ✅ (Premium 10GB anexos) | ✅ (recibos, garantia) | ✅ (logbook + fotos) | ✅ | ✅ | ❌ | dado existe, **não exibido** |
| Custo por km | ✅ | ✅ | ✅ (Alloy) | ❌ | ❌ | ❌ | ❌ |
| Exportação de dados | ❌ não documentado | ✅ | ✅ JSON | ❌ (roadmap) | ❌ | ✅ CSV/JSON | ❌ |
| Sync em tempo real (webhook) | ✅ | ✅ (segundos) | ✅ + 6h backup | ✅ | ✅ | nativo | ✅ |
| Multi-bike com 0km visível / aposentar bike | ✅ aposentar | ✅ | ✅ archive | ✅ | ✅ | limitado | ❌ (some sem aviso) |
| Registro por **código digitado pelo usuário** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ **(único — e é a fricção)** |
| **Idioma PT-BR nativo** | ❌ | ❌ | (8 idiomas) | ❌ | ❌ | ✅ | ✅ |

### 3.3 Leitura estratégica

**Onde o GearLife ganha hoje**
1. **Zero configuração inicial** — não há cadastro de peças, catálogo ou setup. Nenhum concorrente oferece isso; todos exigem "Add your components, set maintenance intervals" (Geer) ou "Register components" (ProBikeGarage).
2. **Gratuito e em PT-BR** — o mercado é majoritariamente anglófono (ProBikeGarage, Componentry, WatchMy.bike, Geer, BikeCare, Bikerly). O Strava em português tem massa grande e pouca oferta local.
3. **Webhook em tempo real** desde sempre — a maioria só ganhou isso depois.

**Onde o GearLife perde**
1. **Notificação**: é o *headline* de todos ("🔔 Receive maintenance notifications"). GearLife = modal ao abrir, deduplicado por aba.
2. **Registro de manutenção**: concorrentes têm formulário no app; GearLife exige sair do app, abrir o Strava, editar título e nota privada, lembrar o código. É a maior fricção do produto e justifica a maior parte dos achados da Seção 2.
3. **Previsão** (não só limite fixo): BikeCare, Componentry e WatchMy.bike já vendem "remaining life in km and days".
4. **Feedback imediato**: concorrentes confirmam a operação na hora; GearLife esconde a linha do componente (A4).
5. **Alcance de plataforma**: iOS/Android nativos (ProBikeGarage, Componentry, Velo Buddy) — o GearLife depende de PWA/Capacitor.

**Território defensável para o GearLife**
- *Menos configuração, não mais*: manter o modelo Strava-as-source-of-truth e **reduzir a fricção do registro** (item D12) em vez de copiar formulários dos concorrentes.
- *Idioma e simplicidade*: onboarding em PT-BR, alertas claros, um punhado de presets por tipo de bike.
- *Custo*: continuar gratuito onde concorrentes cobram por notificação e histórico.

---

## 4. Funcionalidades de alto valor e baixa intrusão

> Critério "não intrusivo": **não exige configuração extra, não polui a tela, é opt-in ou desaparece depois de usado.**

### Tier 1 — conserta o funil (esforço baixo, impacto imediato)

| # | Funcionalidade | Detalhe de implementação | Resolve | Esforço |
|---|---|---|---|---|
| **D1** | **Confirmação de manutenção registrada** | Toast "✓ `chain` registrado — contador zerado" quando o webhook aceitar a marcação + **manter a linha do componente** no modal com contador zerado e botão "Definir limite" (`CardItem.tsx:87,152` deixa de retornar `null` quando `lastMaintenance` existe mesmo com 0). | A4 | ~0,5 dia |
| **D2** | **Empty state + onboarding one-shot** | Flag `firstRun` no localStorage → abre o passo a passo **uma única vez**. `CardDetailModal` vazio ganha "Você ainda não registrou manutenção nesta bike → [Copiar código] [Ver como funciona]". | B1 | ~1 dia |
| **D3** | **Número na barra de progresso** | Restaurar rótulo "5,0 h / 10,0 h" (ou rótulo externo) + texto "faltam ~120 km" abaixo da barra. Mantém `aria-valuetext`. | B4 | ~0,5 dia |
| **D4** | **Toast na cópia + data correta** | Descomentar feedback (`CardItem.tsx:62`) e usar a data do evento em `src/utils/clipboard.ts:41`. | B5 | ~1 hora |
| **D5** | **Página de erro com retry em vez de round-trip de reautenticação** | `apiClient` expõe `status`; `ErroMsg` torna-se alcançável com "Não conseguimos atualizar seus dados. [Tentar novamente]"; **`signOut()` só em 401 confirmado — nunca em timeout/500/429**. Esta é a restrição que quebra o loop de §2.D.2 (item 3, confirmado). | A2, A3 | ~1 dia |
| **D6** | **Landing antes do OAuth** | Remover o redirect incondicional (`index.tsx:103-110`): mostrar valor + aviso de privacidade + "Entrar com Strava". Páginas `/faq`, `/privacidade`, `/contato` passam a ser alcançáveis. **Divide-se em 2 PRs** (landing + sessão real), ver §2.D.9. | A1, C9 | ~2–3 dias |
| **D7** | **Decisão sobre logout + correção do FAQ** | O app hoje **não tem** logout (bloco "Sair" comentado em `Sidebar.tsx:303-320`) e o `faq.tsx:30-34` afirma o contrário. Não há botão para descomentar — é decisão de produto: construir logout real (requer o PR 2 de sessão do D6) **ou** remover a promessa do FAQ. Em qualquer caso, **só depois** da restrição do D5, senão o loop persiste. | A5 | ~1–4 h (FAQ) / ~1 dia (logout real) |
| **D8** | **Proteção contra polling agressivo** | Backoff exponencial no `useAutoSync` (5s → 30s → 2min) + indicador "Atualizando…" discreto + botão refresh manual. Evita estourar 300/15min. | A3 | ~0,5 dia |
| **D9** | **Skeleton quebrado + loading infinito** | Corrigir `rgba(var(--hex), 0.1)` em `Stats.module.css:44-46` e `CardItem.module.css:148,170`; timeout de 10s no loading → mensagem de erro com retry. | B2 | ~0,5 dia |

### Tier 2 — retenção (esforço médio, alto valor percebido)

| # | Funcionalidade | Detalhe | Valor | Intrusão |
|---|---|---|---|---|
| **D10** | **Notificação proativa opt-in** | Toggle "Avisar quando um componente atingir 80% do limite" (default **off**), via `Resend` já existente; **digest máximo 1/semana** por atleta; persistir preferência em Redis ao lado de `strava:equipment-thresholds`. Futuro: Web Push (o `sw.js` já está registrado). | É a categoria do produto; todos os concorrentes têm | Opt-in, frequência limitada, sem pop-up |
| **D11** | **Timeline de histórico + previsão por média própria** | Os `maintenance events` já guardam distância/tempo/data de cada troca. Exibir "Corrente: 4 trocas · média 620 km · última em 12/08 · previsão: ~1.400 km" e alertar por **previsão**, não só por limite fixo. | Dado parado vira valor; começa a fechar a lacuna com BikeCare/Componentry | Só acrescenta informação onde já existe lista |
| **D12** | **Registrar manutenção em 1 toque** *(diferencial)* | Botão "+" no card do componente → seletor da atividade recente → grava o evento via API (ou gera deep-link para o Strava com código e `*` pré-preenchidos). **Mantém o Strava como fonte**, mas tira o usuário do fluxo manual de 3 telas. | Ataca a fricção nº 1 e é o oposto do "mais configuração" dos concorrentes | Não muda o fluxo existente; é um atalho |
| **D13** | **Presets de limite por tipo de bike** | Ao definir o primeiro limite, sugerir ranges (road/mtb/gravel: corrente 500–800 km, pastilhas 1.500 km…). Usuário pode aceitar, editar ou ignorar. | Resolve "não sei quanto colocar" — barreira real de ativação do recurso | Sugestão descartável, nunca preenchimento automático |
| **D14** | **Detecção tolerante de códigos** | Aceitar sinônimos PT (`corrente`→`chain`, `lubrificação`→`lub`) e **reportar** "código não reconhecido: `chainh`" (e-mail resumido ou banner) em vez de ignorar silenciosamente. | A diferença entre funcionar e parecer não funcionar | Zero UI nova; só feedback |
| **D15** | **Ordenação e filtro dos cards** | Bikes por uso recente, reagrupar/ocultar tênis, filtro por tipo de atividade, âncoras quando há 4+ bikes. | C6; concorrentes tratam bem multi-bike | Um seletor discreto |
| **D16** | **Estado "salvando" + segurança no editor de limite** | Spinner/disable em `saveThreshold`, tratar o `.catch` de leitura (`CardDetailModal.tsx:57-59`) com aviso, botão "Remover limite" explícito (hoje exige apagar e salvar), toast fechável. | B6; remove risco de sobrescrita | Só aparece durante a ação |
| **D17** | **Exportação JSON/CSV** | Endpoint `/api/export` lendo as chaves Redis do atleta. | Valor LGPD + confiança; Strava e BikeCare já oferecem; custo baixo | Nenhuma UI nova (link em Configurações) |
| **D18** | **Resumo semanal por e-mail (opt-in)** | Digest: "Nesta semana: 87 km · corrente em 92% · nenhuma peça vencida". Reaproveita o pipeline Resend. | Reengaja quem não abre o app; substitui push nativo no curto prazo | 1 e-mail/semana no máximo, opt-in |

### Tier 3 — diferenciação (esforço maior; avaliar depois dos Tiers 1–2)

| # | Funcionalidade | Observação |
|---|---|---|
| **D19** | Custo por km / "quanto economizei" | Padrão de mercado (ProBikeGarage Premium, WatchMy.bike Alloy, BikeCare). Exige campo de preço — vira configuração, então só com preenchimento opcional. |
| **D20** | Widget na tela inicial (PWA/Capacitor) | Mostra a peça mais próxima do limite. Alto valor percebito, baixa UI. |
| **D21** | Multi-setup indoor/outdoor por bike | Começa a mudar o modelo de domínio (`Equipment` por bike → por *setup*). Só depois do Tier 2. |
| **D22** | Peso por condições (chuva, elevação) | BikeCare é o único; exige dados de clima e potência. Diferencial, mas pesado. |
| **D23** | Integrações Garmin/Wahoo | Componentry é o único com os 4. Abre o público além do Strava, mas exige novo pipeline de ingestão. |
| **D24** | Catálogo de bikes + aposentar bike | ProBikeGarage tem catálogo grande; WatchMy.bike tem perfis públicos. Valioso ao vender a bike, mas é configuração — contrapõe ao diferencial "zero cadastro". |

### Explicitamente evitar (intrusivos)

- **Anúncios** (Bikerly) — degrada a experiência num produto de dados pessoais.
- **Feed social / kudos / desafios** — território do Strava, não do GearLife.
- **Paywall em notificação básica** — WatchMy.bike/Geer cobram por personalização; cobrar por *saber que a peça venceu* puniria o caso de uso central.
- **Mensagens proativas sem opt-in** — o histórico do mercado mostra que "not too eager, not too late" (Geer) é o padrão esperado.

---

## 5. Roadmap

### Fase A — consertar o funil (≈ 4–6 dias)

> **Estado (2026-10-28): PR 1 concluído.** Itens **D1, D5, D6 (PR 1), D7 e D8** implementados, testados e revisados; registro detalhado em §8. **D6 (PR 2 — sessão real) segue pendente**, e D3/D4/D9 permanecem fora desta leva.

Itens: **D1, D3, D4, D5, D6, D7, D8, D9**.

- **D6 (landing) vira dois PRs**, conforme o detalhamento §2.D.9:
  - **PR 1 — Landing acessível (~1 dia):** `index.tsx` para de redirecionar incondicionalmente; tagline em PT-BR; CTA "Como funciona" → `/como-funciona`; criar `src/pages/404.tsx`; remover o `document.cookie` no-op de `AuthContext.tsx:108-109`. ✅
  - **PR 2 — Sessão real (1–2 dias):** substituir `strava_code` (code de OAuth de uso único) por `gl_session` opaco validado no Redis; apagar a chave no logout; padronizar `SameSite=Lax`. Migração: aceitar o cookie antigo por 30 dias. ⏳
  - **⚠️ Inconsistência interna desta seção (corrigida em §8.1):** a linha do PR 1 dizia "ler `gl_session`" e "remover o uso do `strava_code` como sinal de sessão", mas `gl_session` só passa a existir no PR 2. Aplicado literalmente, o PR 1 deslogaria a base inteira. Mantido `strava_code` como sinal de sessão até o PR 2.
- **D5 contém a restrição que quebra o loop (§2.D.2):** `signOut()` só em 401 confirmado, nunca em timeout/500/429. É pré-requisito para qualquer avanço no D7. ✅
- Critério de aceite: usuário consegue ver a landing, entrar por clique explícito, ver confirmação ao registrar manutenção, **não sofre round-trip de reautenticação quando o dashboard falha**, vê erro com retry, e a barra mostra número. — parcialmente coberto; ver §8.4 para o que ficou pendente do item D1.
- **D7 é decisão de produto, não tarefa de código** — o app não tem logout e não há botão para descomentar. Duas opções: construir logout real (requer o PR 2 de sessão) ou remover a promessa do `faq.tsx:30-34`. Pode ficar fora da Fase A, desde que o FAQ deixe de mentir. ✅ (caminho 2)
- Testes: `tests/unit/pages/home-page.test.tsx` (landing como caso padrão), asserção de **ausência de round-trip** quando o dashboard falha, `tests/unit/components/misc-components.test.tsx` (429 com `status` real), `scripts/e2e-ui.mjs:28` (seletor real + `<h1>` novo na landing), novos testes para `CardItem` com contador zerado e `clipboard` com data do evento.
- Gate: `yarn validate` + `yarn lint:colors` verdes.

### Fase B — ativação (≈ 4–5 dias)

Itens: **D2, D13, D14, D15, D16**.

- Critério de aceite: primeiro usuário entende como registrar sem procurar no menu; consegue definir limite logo após registrar; código com typo é reportado; cards ordenados por uso.
- Testes: empty state do `CardDetailModal`, fluxo de onboarding one-shot, normalização de sinônimos, ordenação/filtro.

### Fase C — retenção (≈ 5–7 dias)

Itens: **D10, D11, D17, D18**.

- Critério de aceite: usuário opt-in recebe no máximo 1 e-mail/semana; histórico de trocas visível com previsão; exportação disponível.
- Cuidado: o e-mail precisa de opt-in explícito e mecanismo de descadastramento (LGPD + reputação de domínio).

### Fase D — qualidade (paralela às demais)

- **Acessibilidade:** foco do botão fechar, `visibility:hidden` no sidebar fechado, `<h1>` por seção, contraste dos tokens de aviso ampliando o gate de `validate-color-contrast.mjs` para os usos reais.
- **Mobile:** `--header-height` definido, alvos de toque ≥44px no editor de limite, bottom-nav ou drawer de tela cheia, 1 teste E2E em viewport mobile.
- **Consistência:** unificar PT-BR, remover "Stuff Stats" dos e-mails, corrigir `offline.html`, README da tabela de códigos gerada a partir de `src/services/equipment.ts`.

### Fase E — diferenciação (após A–C)

Itens: **D12** (registro em 1 toque) e, em seguida, **D19, D20**.

---

## 6. Métricas de sucesso

| Métrica | Hoje (estimado) | Meta |
|---|---|---|
| Conclui OAuth e vê dashboard com dado | incerto (redirect cego) | ≥ 90% dos que autorizam |
| Registra 1ª manutenção e **vê a confirmação** | quebrado (A4) | ≥ 80% dos novos atletas em 14 dias |
| Define 1º limite de componente | baixo (só após 2ª corrida) | ≥ 40% dos atletas ativos |
| Round-trips de reautenticação em erro transitório | comum (A2, mecanismo em §2.D.2) | ~0 |
| `signOut()` chamado fora de 401 confirmado | 2 call sites (`Stats.tsx:238,240`) | 0 |
| Usuários com opt-in de notificação | 0 | ≥ 30% dos ativos em 90 dias |
| Chamadas/ min ao Strava por aba (estado saudável) | ~36 (polling de 5s × ≥3 endpoints) | ~0,6 (polling de 60s) — ver §8.2 |
| Tentativas automáticas após falha persistente | ilimitadas (sem `errorRetryCount`) | 1 + 5, com backoff — ver §8.2 |
| Retenção D30 | medir via cookie/anonimizado | +15 pts após Fase B |

---

## 7. Referências

- ProBikeGarage — probikegarage.com (home + /help/), 2026-10-06
- Componentry — componentry.app/features e blog "Best bike maintenance app in 2026", 2026-10-06
- WatchMy.bike — watchmy.bike/en/compare, 2026-10-06
- Geer — geer.bike, 2026-10-06
- BikeCare — bikecare.app/en/compare, 2026-10-06
- mainTrack, Velo Buddy, Bikerly — via comparação do Componentry, 2026-10-06
- Keepbike — keepbike.com, 2026-10-06
- Strava API / My Gear — developers.strava.com, 2026-10-06

---

## 8. Registro de implementação — itens críticos (A)

> Executado em 2026-10-28. Escopo: os cinco achados críticos (A1–A5) e os itens de roadmap a eles vinculados (D6/PR 1, D5, D8, D1, D7). Nada foi commitado até aqui — o trabalho está no working tree.

### 8.1 O que foi feito

| Achado | Item | Implementação | Arquivos |
|---|---|---|---|
| **A1** Primeira visita = redirect automático | D6 / PR 1 | `getServerSideProps` renderiza a landing quando não há sessão; `<h1>GearLife</h1>` único; tagline e subtítulo em PT-BR; CTA "Como funciona" → `/como-funciona`; reutiliza `PublicPageNav` na landing; `src/pages/404.tsx` criado; `document.cookie` no-op removido do `AuthContext` | `src/pages/index.tsx`, `src/pages/404.tsx`, `src/contexts/AuthContext.tsx`, `src/styles/pages/Home.module.css` |
| **A2** Erro transitório desloga em silêncio | D5 | `ApiError` + `getHttpStatus()` no `apiClient`; `Stats` chama `signOut()` **somente** quando o status é `401` | `src/lib/apiClient.ts`, `src/components/Stats.tsx` |
| **A3** Erros e 429 sem mensagem | D5 + D8 | `ErroMsg` reescrito (props `error`/`onRetry`; ramos 429/401/genérico), agora alcançável: painel completo sem dados em cache, banner acima do conteúdo quando os dados existem; backoff limitado e polling conservador (§8.2) | `src/components/ErroMsg.tsx`, `src/components/Stats.tsx`, `src/hooks/useAutoSync.ts` |
| **A4** Componente recém-registrado some da tela | D1 | A linha deixou de retornar `null` quando há data de manutenção mesmo com contador zerado; ganha chip "Registrado" e mantém o editor de limite acessível | `src/components/CardItem.tsx`, `src/styles/components/CardItem.module.css` |
| **A5** Sem logout na UI | D7 | `faq.tsx` deixou de prometer um botão de sair e passa a explicar a revogação no painel do Strava | `src/pages/faq.tsx` |

### 8.2 Correção de rumo no D8 — a proposta original não funcionava

O plano (§4, linha D8) pedia "backoff exponencial no `useAutoSync` (5s → 30s → 2min)". A primeira implementação seguiu essa letra, crescendo o `refreshInterval` em `onError`. **O teste de backoff falhou, e a investigação mostrou que a premissa do plano está errada em dois pontos:**

1. **O SWR já faz backoff sozinho — e de forma ilimitada.** `onErrorRetry` (`swr/dist/_internal/config-context-12s-CCVTDPOP.mjs:470-479`) agenda a próxima tentativa em `~~((random + 0.5) * 2^n) × errorRetryInterval`, com `errorRetryCount` **ilimitado por padrão**. O que faltava não era o backoff, era o **teto**.
2. **Mudar o `refreshInterval` em falha é código morto.** O SWR suspende o polling enquanto houver erro no cache (`swr/dist/index/index.mjs:610` — `execute()` só revalida se `!getCache().error`). Ou seja, o intervalo do polling nunca chega a ser consultado no estado de falha; a fila de retries é o único mecanismo ativo.

Ainda assim, o motivo central do A3 permanece — e **é o caminho saudável, não o de falha**:

| Situação | Chamadas ao Strava por `/api/app/dashboard` |
|---|---|
| | `getAthlete` + `getAthleteStats` + `verifyIfHasAnyActivities` = **3** (`src/pages/api/dashboard.ts:39-42`), mais 1 de `updateStatistics` quando o cache de estatísticas está frio |

Com o `refreshInterval` de **5s** isso dava 36 chamadas/minuto, ou **~540 por janela de 15 minutos**, contra o limite de 300 da API do Strava: uma única aba aberta estourava o quota sozinha em menos de 8 minutos.

**Implementação final do D8:**

- `refreshInterval` de **5s → 60s** (`useAutoSync.ts`). Em 60s o polling consome ~45 chamadas por 15 minutos (≈15% do quota). A frescura praticamente não sofre, porque `revalidateOnFocus` refaz a leitura no retorno da aba e o painel de erro ganhou retry manual.
- `errorRetryCount: 5` + `errorRetryInterval: 5000`, usando o backoff nativo do SWR (≈5s, 10–25s, 20–60s, 40–120s, 80–240s) — a progressão 5s → 2min que o plano queria, agora **com teto**. Depois disso, a recuperação fica por conta do retry manual, do retorno de foco e da reconexão.
- Botão **"Atualizar"** no `Stats` com estado "Atualizando…", que é o caminho mais rápido de frescor e a saída quando as tentativas automáticas se esgotam.

### 8.3 Dois perigos introduzidos pela landing pública — e removidos

Tornar `/` uma página pública cria dois efeitos colaterais que não estavam no plano e que **recriariam um loop de outra forma**. Ambos foram detectados na revisão e corrigidos:

1. **`Cache-Control` público na landing.** A ideia inicial foi `public, max-age=60, s-maxage=600`. Mas `/` tem **duas faces na mesma URL** (landing para visitante, painel para quem tem sessão) decididas por cookie — e cache não se chaveia por cookie. Um usuário recém-logado, redirecionado de volta para `/` pelo OAuth, receberia a landing em cache e veria "Entrar com Strava" em vez do painel: um loop novo, em vez do antigo. Hoje é `private, no-store` para ambos os casos (`index.tsx`).
2. **Marca de versão exposta.** `appVersion` (`.versionMark`) só existia na branch de landing — que era inalcançável em produção, como nota o §2.D.1 ponto 3. Ao abrir a página para visitantes, passaria a expor informação de dev. Removida, junto com o CSS morto.

### 8.4 Pendências registradas (não são omissões)

| Item | Por que ficou de fora | Quando volta |
|---|---|---|
| **D6 / PR 2 — sessão real (`gl_session`)** | Escopo explícito desta leva era o PR 1. É a mudança de maior risco do roadmap (afeta autenticação de toda a base). | Imediatamente após, com a migração prevista em §2.D.10 |
| **D1 — toast "✓ `chain` registrado"** | A confirmação prevista pelo toast depende de um canal do webhook do Strava para o cliente que não existe. A alternativa client-side seria heurística ("data de manutenção hoje + contador zerado"), que dispara a cada abertura enquanto a peça não for usada de novo — um toast errado é pior que nenhum toast. **A metade funcional do A4 está entregue**: a linha persiste, com chip "Registrado" e editor acessível, que é o defeito real descrito no achado. | No PR 2 de sessão, com canal de notificação |
| **D8 — indicador passivo "Atualizando…"** | Exporia o `isValidating` do SWR, repercutindo em 16 mocks de teste para um feedback visual que, a cada 60s, seria ruído. O feedback foi concentrado no botão manual ("Atualizando…" no clique). | Se o intervalo voltar a subir |
| **§2.D.9 — `?intent=login`** | O único consumidor especificado é "redirect de retorno para a landing com toast de sucesso" — e o toast é a penda acima. Sem consumidor, o parâmetro seria código morto. Hoje `authorize.tsx:69` já redireciona para o painel, que é o destino correto em todos os cenários (não existe logout). | Junto com o toast do PR 2 |
| **§2.D.9 — `noindex` nas rotas autenticadas** | Feito: `SeoHead` ganhou a propriedade `noindex`, usada em `/` quando `props.code` indica sessão. O `robots.txt.ts` já trazia `Allow: /` e o sitemap já indexava a landing, então nenhum deles precisou mudar. | ✅ concluído |

### 8.5 Verificação

| Etapa | Resultado |
|---|---|
| `yarn lint` | verde (1 warning pré-existente em `Sidebar.tsx:128`, não introduzido aqui) |
| `yarn lint:colors` | verde (APCA, ambos os temas) |
| `yarn typecheck` | verde |
| `yarn test:unit` | verde — **43 arquivos / 296 testes** (7 novos: backoff limitado, recuperação automática, banner de erro com cache, refresh manual, página 404; +2 na §8.6) |
| `yarn test` (suíte completa) | verde — **57 arquivos / 368 testes**, incluindo integração e regressão |
| `yarn build` | verde — `/404` presente no output; First Load JS de `/` segue em 101 kB (nenhum código de servidor vazou para o bundle do cliente) |
| `yarn test:e2e:ui` | verde — inclui o trecho de **aceite do A2/A3**: contexto isolado com cookie de sessão opaco, intercept de `/api/app/dashboard` devolvendo 429, e asserção de que **nenhuma** chamada vai para `/api/oauth/start`, `/api/app/logout` ou `strava.com`; e o teste da §86 (401 → landing, com `/api/app/logout` obrigatório e round-trip ao Strava proibido) |
| `yarn test:e2e:smoke` e `:http` | verdes — os dois scripts foram corrigidos, porque vigiavam exatamente o defeito: o smoke do Playwright exigia o redirect para o OAuth, e o HTTP aceitava 400/redirect como sucesso na home. Ambos passariam mesmo com o bug de volta |

**Achados da revisão (2 eixos, em paralelo):** 0 violações duras de padrão; 3 comentários de idioma/posição corrigidos. Do lado de spec, 6 itens apontados como parciais — 2 corrigidos nesta rodada (`PublicPageNav` reaproveitado na landing, banner de erro para o caso "429 com dados em cache"), 2 resolvidos por decisão documentada (§8.4) e 2 já concluídos (§8.4).

### 8.6 Regressão trazida pelo A2 — "sem sessão" era codificada como 500

Reportada logo após a entrega, em teste manual: apagando `strava:auth:69666780` do Redis, o app passava a exibir **"Não conseguimos atualizar seus dados — ocorreu uma falha ao falar com o Strava"**, com `GET /api/app/dashboard 500` e retries que nunca resolviam.

**Por que isso passou a acontecer agora.** Antes do A2, o `Stats.tsx` tratava *qualquer* erro como fim de sessão: chamava `signOut()`, limpava cookies e o usuário era reautenticado sozinho pelo `approval_prompt=auto`. O app se "recuperava" às cegas — e era exatamente essa recuperação cega que sustentava o loop de reautenticação do §2.D.2. O A2 estava certo em parar de deslogar em falha transitória; o que ele fez foi **revelar** um defeito anterior de semântica HTTP que antes ficava escondido pelo redirect.

**A causa raiz.** `getAthleteAccessToken()` não distinguia duas situações muito diferentes:

| Situação | O que é de verdade | O que o código fazia |
|---|---|---|
| Chave `strava:auth:<id>` inexistente ou corrompida | **Ausência de sessão** — o atleta precisa autenticar de novo | `throw new Error(...)` genérico |
| Falha ao renovar o token / Strava indisponível | **Falha transitória** — tentar de novo pode funcionar | `throw new Error(...)` genérico |

E `/api/dashboard.ts:66` respondia **500** para tudo. O cliente, corretamente instruído pelo A2 a só deslogar em 401, ficava preso: recebia 500, mostrava o painel de erro, tentava de novo — algo que nunca ia funcionar, porque não havia sessão nenhuma para recuperar.

**Correção (duas partes):**

1. **Erro tipado** — `StravaSessionNotFoundError` (`src/services/strava-auth.ts`), lançado quando a chave está ausente ou ilegível (JSON corrompido é tão inutilizável quanto registro ausente: não há como renovar o token). O `catch` interno passa a reemitir esse erro **sem embrulhar**, senão o tipo se perdia no caminho até o endpoint.
2. **`/api/dashboard` responde `401`** quando o erro é de ausência de sessão, via `respondIfSessionMissing()` (`src/server/auth.ts`). É o status que a resposta já deveria ter: sem sessão não é falha do servidor, é falta de autenticação — e o cliente já sabe o que fazer com 401 (encerrar a sessão e voltar para a landing).

**Decisão registrada: a validação NÃO foi colocada no `getServerSideProps`.** A primeira versão consultava `hasStravaSession(athleteId)` no `index.tsx` e pousava direto na landing, pulando o flash do painel. Foi medida antes de decidir, e o custo não compensava:

| Chamada ao Upstash | Latência |
|---|---|
| 1ª (conexão fria) | 283 ms |
| 2ª | 77 ms |
| 3ª (quente) | 20 ms |

O `/` autenticado pagaria **20–80 ms de bloqueio de first-paint em toda visita** — para resolver um caso raro (registro expirado, flush, revogação no Strava; para usuário ativo o TTL de 90 dias é renovado a cada uso, então na prática nunca). É o mesmo erro de proporção do polling de 5s do §8.2, só que no extremo oposto: fazer o caminho comum pagar pela exceção. O código foi revertido e `hasStravaSession` removida por não ter mais uso.

O padrão adotado é o de qualquer app com sessão: **o shell renderiza, a chamada de dados autoriza.** São ~300 ms uma única vez, e como o `signOut()` limpa os cookies nesse processo, a visita seguinte já cai direto na landing. A decisão fica registrada em comentário no próprio `getServerSideProps` e no teste da home (`setHeader` chamado exatamente uma vez = nenhum I/O), para não ser reaberta por engano.

**Só o 401 encerra a sessão — inclusive do lado do servidor.** Um lapso do Redis não desloga ninguém: `hasStravaSession` não existe mais, e no cliente só `getHttpStatus(isError) === 401` chama `signOut()`. Timeout, 500 e 429 mantêm a sessão e mostram o painel de erro com retry. Distinguir "não existe sessão" (afirmação definitiva) de "não consegui falar com o Strava" (transitório) é o mesmo princípio do A2, agora aplicado dos dois lados.

**Sobre recriar a chave.** Não é possível: `strava:auth:<id>` guarda o *refresh token* do atleta, e esse valor só existe após o usuário autorizar no Strava. O code do OAuth é de uso único e o cookie `strava_code` não serve para recuperá-lo. O caminho correto — e o que a correção faz — é detectar a sessão ausente, encerrá-la e mostrar a landing com o ícone de login, deixando que o próprio login recrie a chave. Isso já era verdade no fluxo normal; o defeito estava em não tratar a ausência como "deslogado".

**Sobre o webhook.** Nenhuma mudança: `webhook.ts:222` já fazia `redis.exists()` e respondia 403 para atleta sem sessão armazenada, então `getAthleteAccessToken()` não é alcançado nesse caso.

**Uma lição sobre o E2E, que quase produziu um teste vazio.** A primeira versão do teste E2E interceptava `/api/app/dashboard` com `route.fulfill({ status: 401 })` — o que **não passa pelo servidor**, logo não testa o mapeamento 500→401; testa o cliente dado um 401. A prova de não-vacuidade (remover o `respondIfSessionMissing`) passou, e foi isso que expôs a camada trocada. Separadas as duas:

- a **integração** (`dashboard.test.ts`) cobre o servidor e falhou corretamente ao quebrar o fix (`expected 500 to be 401`);
- o **E2E** (`e2e-ui.mjs`) cobre o navegador e falhou corretamente ao quebrar o cliente (`if (getHttpStatus(isError) === 401)` → `if (false)`), com `Um 401 não limpou os cookies de sessão`.

O E2E também quase ganhou um discriminador errado: a landing e o **painel de erro do 401** ambos exibem `href="/api/oauth/start"` (`ErroMsg` tem ramo de login), então o teste foi escrito contra a tagline "Pedale. A gente cuida da manutenção.", que só existe na landing.

**Testes de regressão:**

| Arquivo | O que cobre |
|---|---|
| `tests/unit/services/strava-auth.test.ts` | `StravaSessionNotFoundError` é lançada (e não embrulhada) para chave ausente, JSON corrompido e formato inválido; erro de refresh continua genérico e **não** é confundido com ausência de sessão |
| `tests/unit/server/auth.test.ts` | `respondIfSessionMissing` responde 401 para ausência de sessão e **devolve `false`** para qualquer outro erro — se devolvesse `true` para tudo, uma falha de infra deslogaria o usuário |
| `tests/integration/dashboard.test.ts` | O cenário reportado: cookie presente, sessão sem Redis → **401**, não 500, e sem `log.error` (é condição esperada, não erro de servidor) |
| `tests/unit/pages/home-page.test.tsx` | `getServerSideProps` segue sem nenhum I/O: só cookies, `setHeader` chamado uma única vez |
| `scripts/e2e-ui.mjs` | Navegador real: 401 → pousa na landing com a tagline, chama `/api/app/logout` e **não** faz round-trip a `/api/oauth/start` nem a `strava.com` — o espelho do teste de 429, que exige o contrário |

### 8.7 Correção de fluxo — visitante sem sessão ≠ sessão revogada durante o uso

O teste manual posterior mostrou que a implementação inicial do 401 ainda era ampla demais: ela tratava qualquer 401 como sessão revogada e iniciava OAuth automaticamente. Isso é inadequado no **primeiro carregamento** sem `strava:auth:<id>`: pode ser a primeira visita, um cookie antigo ou uma aba recarregada depois de Redis ser limpo. Nesse caso, o comportamento desejado é a landing limpa — sem texto de expiração e sem ida automática ao Strava.

O fluxo agora distingue os dois contextos em `Stats.tsx`:

| Situação | Evidência | Resultado |
|---|---|---|
| Primeiro carregamento sem sessão no Redis | Nenhum dashboard recebido com sucesso **nesta execução da página** | `signOut()` limpa cookies → landing limpa; o usuário escolhe "Entrar com Strava" |
| Sessão revogada enquanto o painel estava aberto | Um dashboard foi recebido com sucesso nesta execução, depois chega 401 | Uma tentativa automática de OAuth; se o callback não recriar a sessão, o teto da `sessionRecovery` encerra cookies → landing limpa |

Cache em `sessionStorage` **não conta** como sessão viva: uma aba antiga pode carregar dados em cache, mas ao recarregar depois de apagar Redis continua sendo primeiro carregamento e deve pousar na landing. Só uma resposta bem-sucedida da API na página atual ativa a recuperação automática.

Também foi removido o ramo visual do 401 em `ErroMsg`: não há mais "Sua sessão com o Strava expirou ou foi revogada" nem link "Entrar novamente". O 401 é uma transição de sessão, não um estado de erro para exibir. Para não deixar cookies parciais quando o callback OAuth falha, `api/authorize` limpa `strava_code`, `strava_athleteId` e `strava_oauth_state` antes de redirecionar para `/`.

**Cobertura acrescentada:** `Stats` valida primeiro carregamento com cache antigo → `signOut()` sem OAuth; sessão viva seguida de 401 → `sessionRecovery`; `ErroMsg` não renderiza 401; e o E2E exige landing sem texto "Sessão expirada" para o contexto sem sessão.

### 8.8 Decisão final — sem OAuth automático após 401

O teste manual do cenário “painel aberto → logout no Strava → chave Redis apagada” mostrou o limite fundamental da proposta de §8.7: a tentativa de recuperação navega para `/api/oauth/start`; se a sessão do Strava acabou, **o Strava exibe a própria tela de login**. Isso é indistinguível, antes do redirect, de um atleta que ainda tem uma sessão válida — o app não possui endpoint de verificação silenciosa da sessão do Strava.

Portanto, a tentativa automática foi removida. A regra final é simples e previsível: **qualquer 401 limpa os cookies locais e volta para a landing limpa.** O OAuth acontece somente após clique explícito em “Entrar com Strava”. Assim o app nunca leva alguém à tela de login do Strava como efeito colateral de uma manutenção de sessão.

Isso substitui a linha “sessão viva seguida de 401 → `sessionRecovery`” de §8.7: não existe mais `sessionRecovery`, teto de tentativa ou redirect automático. O `Stats` ainda trata 401 antes de qualquer dado cacheado do SWR, para que um painel aberto não deixe aparecer “Sessão expirada”; ele chama `signOut()` e a landing aparece sem mensagem. Os testes agora cobrem tanto cookie/cache antigo quanto painel previamente carregado: ambos devem chamar `signOut()` e nunca renderizar a mensagem de expiração.

**Verificação desta correção:** `yarn validate` verde (**57 arquivos / 369 testes**, build incluído); `e2e-ui`, `e2e-http-smoke` e `e2e-smoke` verdes. Permanece somente o warning pré-existente de `Sidebar.tsx:128` (`exhaustive-deps`).

### 8.9 Logout encerra também a interface transitória

O `ModalContainer` é irmão do conteúdo da home dentro do mesmo `AuthProvider`; por isso, trocar `codeReturned` para `null` não o desmontava. Se o usuário estava vendo detalhes de um card quando um 401 encerrava a sessão, a landing aparecia **atrás** da modal. `signOut()` agora também limpa `activeModal` e `modalData` antes de navegar. O efeito de cleanup de `ModalContainer` desmonta o diálogo e restaura o scroll do `body`. A regressão em `tests/unit/contexts/auth-context.test.tsx` abre uma modal, chama logout e exige `activeModal = none`.

**Verificação:** `yarn validate` verde (**57 arquivos / 369 testes**, build incluído); após rebuild limpo (`rm -rf .next`), `e2e-ui`, `e2e-http-smoke` e `e2e-smoke` verdes.

### 8.10 Síntese — comportamento final de sessão após quatro relatos de teste manual

O ajuste do 401 não saiu de um plano; saiu de quatro testes manuais do proprietário, cada um revelando um limite que a rodada anterior não via. O histórico é registrado abaixo porque as primeiras três soluções foram **superadas**, não refinadas:

| Rodada | Relato do proprietário | Solução tentada | Por que não bastou |
|---|---|---|---|
| 1 | "sem sessão no Redis" virava erro 500 com retries infinitos | `StravaSessionNotFoundError` → 401; landing sem validação no `getServerSideProps` | Resolveu o 500, mas o cliente ainda tratava 401 como "sessão revogada" |
| 2 | Landing ainda mostrava "Sessão expirada" e mandava ao Strava no primeiro acesso | `sessionRecovery` com teto de 1 tentativa; `ErroMsg` sem ramo 401 | A tentativa automática de OAuth era errada em **qualquer** contexto |
| 3 | Logout no Strava + chave apagada levava à tela de login do Strava | **Remoção** do `sessionRecovery`: 401 → `signOut()` → landing, sempre | Resolveu o redirect, mas a modal aberta atravessava o logout |
| 4 | Modal de detalhe do card continuava aberta sobre a landing | `signOut()` limpa `activeModal`/`modalData` (§8.9) | — |

**Regra final vigente:** qualquer `401` de `/api/app/dashboard` limpa os cookies locais, zera o estado transitório (modal, erro) e pousa na landing limpa. **Não existe OAuth automático.** A ida ao Strava só acontece por clique explícito em "Entrar com Strava".

| Situação | Comportamento |
|---|---|
| Primeira visita, cookie antigo ou aba recarregada sem sessão no Redis | Landing limpa, sem mensagem, sem redirect |
| Sessão revogada/apagada com painel ou modal abertos | Landing limpa; modal e erro são encerrados junto com a sessão |
| Falha transitória (rede, 5xx) ou `429` | Painel/banner de erro com retry manual; **não** desloga |
| Clique em "Entrar com Strava" | OAuth único e explícito; falha no callback limpa cookies parciais e volta para `/` |

**Estado final da verificação:** `yarn lint` e `yarn lint:colors` verdes; `yarn typecheck` verde; `yarn validate` verde — **57 arquivos / 369 testes** + build; `e2e-ui`, `e2e-http-smoke` e `e2e-smoke` verdes em build de produção. Permanece apenas o warning pré-existente de `Sidebar.tsx:128` (`exhaustive-deps`), não introduzido por este trabalho.

### 8.11 Simplificação da landing pelo proprietário

Após a entrega, o proprietário ajustou a landing e o menu deslogado diretamente no código — mudanças de produto, não regressões:

| Antes | Depois |
|---|---|
| `<h1>GearLife</h1>` abaixo do logotipo | removido (comentado); o destaque passou a ser a tagline "Pedale. A gente cuida da manutenção." |
| CTA "Como funciona" como link para `/como-funciona` | botão que abre o modal informativo |
| `<PublicPageNav />` na landing | removido (comentado); as páginas públicas continuam acessíveis por URL direta e se linkam entre si pelo nav próprio |
| Item "Como funciona" no menu lateral deslogado | renomeado para "Ajuda" |
| FAQ: "Posso desconectar minha conta?" / "Sim. Você pode sair da sessão no app…" | "Como desconecto minha conta?" com o fluxo real (revogação no Strava, sessão de até 30 dias, limpeza de dados do site em dispositivo compartilhado) |

**Efeito nos testes — nada do comportamento anterior foi perdido, só o que a UI não mostra mais:** `home-page.test.tsx` deixou de exigir o `<h1>` único e os links de páginas públicas na landing, passando a vigiar tagline + CTA de login + botão de modal; `sidebar.test.tsx` procura "Ajuda" no menu deslogado; o `e2e-ui` entra nas páginas públicas por URL direta (a landing não as linka mais) e volta à landing pela tagline; o `e2e-smoke`/`e2e-http-smoke` passaram a asserir a tagline em vez de "GearLife" — que também aparecia no `<title>` e no cabeçalho do menu, e por isso passaria mesmo sem o corpo da landing.

**Pendência de acessibilidade registrada (decisão do proprietário, não corrigida de ofício):** a landing ficou sem nenhum `<h1>`, o que reabre o problema do A1 para navegação por títulos. Se quiser restaurar sem trazer de volta o nome da marca em corpo grande, a saída é promover a tagline a `<h1>` (o CSS `.homeText h1` pode receber o tamanho atual do `h2`). O CSS `.brandTitle` e o import de `PublicPageNav` em `index.tsx` ficaram órfãos enquanto o comentário existir — removidos no dia em que a decisão for considerada final.
