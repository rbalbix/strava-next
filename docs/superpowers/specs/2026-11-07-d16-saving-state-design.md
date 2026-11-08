# Design curto — D16 mínimo: estado "salvando" no editor de limite

> **Data:** 2026-11-07
> **Escopo:** item D16 do `docs/plano-usabilidade-gearlife.md` (§4, achado B6) — apenas a
> parte desbloqueada pelo brainstorming de 2026-11-07 (registro no §8.15 do plano local).
> **Status:** aprovado pelo proprietário na conversa de 2026-11-07 (caminho "D16 mínimo").

## Intent / por quê

`saveThreshold` (`CardDetailModal.tsx:113-141`) não tem estado de carregamento: o botão
"Salvar limite" continua ativo durante a requisição — **duplo clique envia duas gravações**
(§2.B6) — e nada na tela diz "está salvando". É a única entrega do D16 desbloqueada pelo
brainstorming; as demais ficaram suspensas ou condicionadas (§8.15).

## Goals

1. No máximo **uma** requisição por salvamento: clique duplo, Enter duplo ou
   clique+Enter durante a promessa não disparam nova gravação.
2. Feedback visível de "salvando": spinner no botão + `aria-busy`.
3. Preservar integralmente o comportamento pós-resposta: toast, fechamento do editor e o
   caminho 401 → `signOut` do §8.13 (`endSessionOnUnauthorized` intocado).

## Non-goals / anti-goals

- Aviso na falha de carga (não-401) — **suspenso** (dúvidas do proprietário; opções
  registradas no §8.15 para retomar).
- Botão "Remover limite" explícito — **aguarda aprovação de visual** (mockup antes de
  qualquer código; preferência inicial: direto, só com limite salvo).
- Toast fechável / duração — **suspenso** (§8.15).
- Alvos ≥44px no editor — **Fase D** (decisão de 2026-11-07).
- E2E — nenhum fluxo monta a modal do card (mesma nota do §8.13).
- Qualquer mudança de API.

## Constraints

- Gate do repo: `yarn validate` + `yarn lint:colors` (APCA) verdes.
- `react-spinners@^0.15.0` já é dependência — usada no `Header.tsx` com
  `color='var(--…)'` (padrão de token aceito no código do app).
- Labels em PT-BR; `thresholdKm: 0` continua significando "remover limite".

## Decisions (chamadas do design — corrija se discordar)

1. **Guard por estado + early return:** `saving: boolean`; `saveThreshold` começa com
   `if (saving) return;`, seta `true` antes do `try` e limpa em `finally`. Os três
   gatilhos (clique duplo, Enter, clique+Enter) são cobertos num ponto só; `finally`
   cobre sucesso, erro não-401 e o caminho 401.
2. **`aria-disabled` em vez de `disabled` nativo:** `disabled` derruba o foco para o
   `body` quando o botão está focado — no caminho de falha o botão reabilita e o usuário
   perde a posição no Tab. `aria-disabled` + guard interno mantém o foco e o leitor de
   tela anuncia o estado; o estilo desativado é por CSS (atributo), sem classe nova.
3. **Spinner:** `ClipLoader` do `react-spinners` (gira — o `PulseLoader` do Header
   pulsa), `size={20}` para ocupar a mesma caixa do ícone `MdOutlineSaveAlt` (zero
   deslocamento de layout), `color='var(--gl-surface-card)'` — a cor do ícone dentro do
   botão verde. O ícone volta quando a requisição termina.
4. **Input `readOnly={saving}`:** bloqueia edição durante o envio (evita texto que seria
   descartado silenciosamente pela resposta) **sem** perder foco — `readOnly` mantém o
   elemento focável, ao contrário de `disabled`.
5. **CSS via seletor de atributo:** `.thresholdRow button[aria-disabled='true']` +
   variante `:hover` anulando o `brightness(1.1)` do estado normal. Sem cores novas →
   `lint:colors` sem risco.
6. **Intocados:** `endSessionOnUnauthorized`, toast/`ToastContext`, `sessionStorage`,
   seletor de unidade (trocar de unidade durante o envio é inofensiva — a resposta fecha
   o editor).

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/CardDetailModal.tsx` | estado `saving`, guard, `aria-disabled`/`aria-busy`, spinner condicional, `readOnly` no input |
| `src/styles/components/CardDetailModal.module.css` | regras do estado `[aria-disabled='true']` (cursor + anulação do hover) |
| `tests/unit/components/card-detail-modal.save.test.tsx` | novos casos (abaixo) |

## Testes

| # | Caso | Asserção |
|---|---|---|
| 1 | promessa pendente (deferred) | botão `aria-disabled='true'` + `aria-busy='true'`, input `readOnly`; resolver → toast "Limite salvo" e editor fecha |
| 2 | clique duplo + Enter duplo durante a pendência | `saveEquipmentThreshold` chamado **uma única vez**; resolver → estado normal |
| 3 | rejeição não-401 | toast "Falha ao salvar limite", editor aberto, `aria-disabled` deixa de ser `true` e o input volta a editável |
| 4 | 401 | casos do §8.13 existentes permanecem verdes |

**Gate final:** `yarn validate` + `yarn lint:colors` + `yarn test:report`.

## O que fica para o builder

Nomeação exata dos seletores de teste (helpers `findButton`/`getValueInput`/`mountModal`
já existem no arquivo), ordem dos casos e o `finally` limpando `saving` mesmo no caminho
401 (o `signOut` real desmonta a modal; em React 18 o setState pós-desmontagem é inócuo).

## Ajustes pós-teste manual (2026-11-08)

1. **O botão não pode mudar de tamanho ao trocar para o spinner** (relato do
   proprietário). A primeira tentativa — um slot de tamanho fixo em volta do
   conteúdo — desalinhou o ícone e foi **revertida**; a correção final congela
   a **largura do próprio botão** (`.thresholdRow > button`: 2,45rem no
   desktop e 2,85rem no ≤768px, exatamente os 20px de conteúdo mais o padding
   de cada breakpoint). Assim os dois estados têm a mesma caixa e o ícone
   continua centralizado pelo `align-items/justify-content` original. O
   `ClipLoader` mantém `cssOverride={{ boxSizing: 'border-box' }}` e `size={16}`.
2. **Toast de sucesso com componente e valor** (solicitado): passa a ser
   `Limite salvo [corrente: 150 km]` — legenda do componente, valor e unidade
   (`km` ou `h`). Como as legendas de `equipment.ts` já terminam com `:`, o
   template remove esse `:` final da legenda antes de reinserir o separador —
   numa segunda rodada o proprietário relatou a mensagem com `::`
   (`corrente:: 150 km`) e o caso entrou como teste de regressão. `Limite
   removido` e `Falha ao salvar limite` permanecem como estavam.
3. **Toast mais longo e sem estouro de texto** (solicitado): duração padrão de
   2000ms → **4000ms** (+2s) em `ToastContext` e remoção do `white-space:
   nowrap` em `.toast` — o texto longo passa a quebrar dentro da caixa
   (max-width 320px). A pergunta sobre **fechar** o toast segue **suspensa**
   (§8.15 do plano local).
