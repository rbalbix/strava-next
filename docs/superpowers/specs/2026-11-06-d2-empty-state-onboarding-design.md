# Design curto — D2: Empty state + onboarding one-shot

> **Data:** 2026-11-06
> **Escopo:** item D2 do `docs/plano-usabilidade-gearlife.md` (§4 Tier 1, §5 Fase B, achado B1).
> **Status:** aguardando aprovação do proprietário.

## Intent / por quê

Quem abre o detalhe de uma bike **sem nenhuma manutenção registrada** vê um `<ul>` vazio
(`CardDetailModal.tsx:252-341`) — tela muda, sem instrução nenhuma. E o passo a passo da
mecânica central ("`*` no título + código na nota privada") só é alcançável pelo menu
lateral, depois do login. É o critério nº 1 da Fase B: *o primeiro usuário entende como
registrar sem procurar no menu*.

## Goals

1. Modal de bike sem componentes registrados mostra a mensagem definida pelo proprietário
   + botão **"Ver como funciona"**.
2. One-shot: a **primeira** carga do painel com **zero** manutenções registradas abre o
   modal "Como funciona" uma única vez (flag em `localStorage`).
3. Zero mudança para quem já tem dados e para gears não-bike (tênis).

## Non-goals / anti-goals

- Botão "Copiar código" — **fora do escopo** (decisão do proprietário em 2026-11-06;
  o D2 original do plano previa dois botões, ficou só "Ver como funciona").
- Pilha de modais: `openModal('info')` **substitui** o `card-detail`; fechar o "info"
  pousa no dashboard (reabrir a bike é 1 clique). Construir pilha é escopo futuro.
- E2E nesta leva — a cobertura é em unit (o fluxo é 100% client-side com mocks).
- Itens D13/D14/D15/D16, D1 (toast), D3/D4/D9 (suspensos).

## Constraints

- Gate do repo: `yarn validate` + `yarn lint:colors` (APCA) verdes.
- Mensagens em PT-BR; botão é `<button>` real (focus trap/foco já são do `ModalContainer`).
- `localStorage` é **o primeiro uso no app** (o cache do dashboard usa `sessionStorage`);
  acessado só em efeitos (client-side) — nunca em `getServerSideProps`.

## Approaches — as duas decisões em aberto

### 1. Gatilho do one-shot

| Opção | Como | Por quê não / por quê sim |
|---|---|---|
| **A. Carga do painel com 0 eventos** *(escolhida)* | No efeito de sucesso do dashboard (`Stats.tsx`, ramo `if (dashboard)`): soma de `gearStats[].equipments === 0` e flag ausente → seta flag e `openModal('info')` | Acontece **antes** do usuário cair na tela muda; é o estado exato em que o passo a passo é útil |
| B. Primeira abertura do modal vazio | Dispara ao abrir o `card-detail` | **Rejeitada:** trocaria o modal do bike pelo "info" no mesmo clique — confuso |
| C. Primeiro login, independente de dados | Dispara sempre | **Rejeitada:** intrusivo para a base existente (que já sabe a mecânica) |

Condicional única, sem ramo por `hasGear`: usuário sem bike/sem atividades também tem
0 eventos e também se beneficia da explicação (a modal é genérica).

### 2. Marcacao do empty state

| Opção | Como | Por quê não / por quê sim |
|---|---|---|
| **A. `<div>` no lugar do `<ul>` quando vazio** *(escolhida)* | `isBikeActivity && equipments.length === 0` → renderiza o empty state; com itens → o `<ul>` de hoje; não-bike → nada | Sem `<ul>` sem `<li>` (semântica limpa); `.timeline` não tem estilos próprios, então "nada" para não-bike é visualmente idêntico ao `<ul>` vazio de hoje |
| B. `<li>` dentro do `<ul>` | Lista sempre renderiza | `<ul>` com um `<li>` que não é item de timeline confunde leitores de tela e o CSS da lista |

## Decisions (chamadas do design — corrija se discordar)

1. **Mensagem exatamente como definida:** "Você ainda não registrou manutenção para
   nenhum componente da sua bike" + botão "Ver como funciona".
2. **Empty state só para bikes** com zero eventos registrados
   (`isBikeActivity && equipments.length === 0`). Tênis/não-bike: comportamento atual.
3. **One-shot:** flag `gl_onboardingShown` em `localStorage`, setada **antes** de
   `openModal('info')` (protege contra duplo efeito do StrictMode e contra o poll de 60s).
   Só o ramo de dados **frescos** dispara (o cache de sessão não conta).
4. **Mesma modal dos dois caminhos:** `openModal('info')` → `InitialInfoModal` →
   `HowItWorksContent` — idêntico ao botão "Ajuda" do sidebar e ao "Como funciona" da
   landing (`index.tsx:72`).
5. Conflito com `threshold-alert`: **impossível** (overdue implica eventos registrados ⇒
  condição do one-shot falsa).

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/CardDetailModal.tsx` | Ramo do empty state + `openModal('info')` (já importa `AuthContext`) |
| `src/styles/components/CardDetailModal.module.css` | Estilo do empty state (tokens existentes; passa `lint:colors`) |
| `src/components/Stats.tsx` | Checagem do one-shot no ramo `if (dashboard)` |
| `tests/unit/components/card-detail-modal.*.test.tsx` | Novos casos (ver abaixo) |
| `tests/unit/components/stats.test.tsx` | Casos do one-shot |

## Testes

1. Modal de bike vazio → mensagem + botão visíveis; clique em "Ver como funciona" →
   `openModal('info')`.
2. Modal de bike **com** eventos → sem empty state (regressão do fluxo atual).
3. Modal de tênis (`activityType: 'Run'`, vazio) → **sem** a mensagem.
4. Stats: dashboard com 0 eventos e sem flag → flag gravada + `openModal('info')` exatamente
   uma vez (2ª execução não repete).
5. Stats: dashboard com eventos → não dispara.
6. Suíte existente (em especial `card-detail-modal.save.test.tsx`) continua verde.

**Gate final:** `yarn validate` + `yarn lint:colors`.

## Tarefas paralelas (manutenção prometida, fora do D2)

- Atualizar o plano: refletir a remoção do chip "Registrado" (§8.1/§8.4 — commit
  `bb2125a`); ancorar a remoção do fallback legado (~2026-12-04) com a checklist do §8.12.4.

## O que fica para o builder

Detalhes de estilo (seguindo os tokens/`emptyState` já existentes no `Stats`), nomeação
exata dos seletores de teste e a ordem de execução dos casos.
