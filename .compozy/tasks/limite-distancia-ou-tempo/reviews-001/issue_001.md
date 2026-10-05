---
provider: manual
pr:
round: 1
round_created_at: 2026-10-03T23:21:17Z
status: resolved
file: src/components/CardDetailModal.tsx
line: 139
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Clicar no segmento de unidade já ativo apaga o valor digitado

## Review Comment

`handleUnitChange` (linha 139) sempre grava `''` em `inputs[equipmentId]`, e o
`onClick` dos segmentos `role="radio"` (linha 289) chama a função mesmo quando
`unit === activeUnit`. Ou seja: selecionar o segmento **já ativo** — operação que
num radio-group nativo é um no-op — limpa o campo de valor que o atleta acabou de
digitar.

O PRD define a limpeza como consequência de *trocar* de unidade ("Trocar a unidade
limpa o valor digitado e volta a pedir um novo"), não de clicar. O caminho por
teclado (`handleUnitKeyDown`) alterna os segmentos sempre, então está correto; só o
clique repete a limpeza quando nada muda. Não há teste em
`tests/unit/components/card-detail-modal.save.test.tsx` cobrindo clique no segmento
ativo, então o comportamento passou despercebido.

Impacto: perda silenciosa de digitação (usabilidade) e divergência com o critério do
PRD e com o padrão ARIA de radio-group (selecionar o mesmo rádio não dispara change).

Sugestão de correção — tornar a seleção idempotente:

```tsx
onClick={() => {
  if (unit !== activeUnit) handleUnitChange(e.id, unit);
}}
```

(ou um `if (unit === activeUnit) return;` no topo de `handleUnitChange`, usando a
mesma fonte de `activeUnit` do render). Adicionar teste de regressão: abrir o
editor, digitar um valor, clicar no segmento já selecionado e esperar que o campo
continue preenchido.

## Triage

- Decision: `VALID`
- Notes: Causa raiz confirmada no código: o `onClick` chama `handleUnitChange`
  sem comparar com `activeUnit` — que é a MESMA fonte usada por `aria-checked`
  e `tabIndex` no render — então a função limpa `inputs[equipmentId]` mesmo
  quando nada muda. O caminho por teclado não é afetado (`handleUnitKeyDown`
  sempre calcula `next` diferente de `active` e por isso a limpeza ali está
  correta). Verificado também que não há teste cobrindo o clique no segmento
  ativo. Abordagem escolhida: guard `unit !== activeUnit` no `onClick` (seleção
  idempotente, como num radio-group nativo) — mudança mínima, sem tocar na
  assinatura de `handleUnitChange`; teste de regressão novo em
  `tests/unit/components/card-detail-modal.save.test.tsx`.
