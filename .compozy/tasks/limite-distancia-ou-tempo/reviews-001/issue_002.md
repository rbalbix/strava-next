---
provider: manual
pr:
round: 1
round_created_at: 2026-10-03T23:21:17Z
status: resolved
file: src/components/CardDetailModal.tsx
line: 244
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Nome acessível do input de limite passa a ser "km h"

## Review Comment

O `<label>` da linha 244 não tem texto próprio e envolve toda a `.thresholdRow`:
input de valor + radiogroup `km|h` + botão salvar. O nome acessível do input é
computado a partir do subtree do label (excluindo o próprio input), resultando em
**"km h"** — anunciado por leitor de tela como "km h, spinbutton, 48" com
independência da unidade efetivamente escolhida.

Antes desta feature o label envolvia apenas input + ícone (nome vazio — lacuna
pré-existente já registrada como follow-up no `task_10.md`); ao inserir o radiogroup
dentro do label, a feature transformou "sem nome" em "nome errado", o que é pior para
quem usa tecnologia assistiva: o nome soa como uma unidade composta (km·h) em vez de
ausência de rótulo.

O radiogroup em si está correto (`aria-label='Unidade do limite'`, `aria-checked`,
tabindex móvel) e o PRD exige apenas que o controle de unidade anuncie seu estado —
cumprido. O problema é a associação implícita do label com o campo de valor, agravada
por esta mudança.

Sugestão de correção — qualquer uma das opções:

```tsx
<input
  type='number'
  aria-label={`Limite de ${e.caption}`}
  ...
/>
```

ou mover o radiogroup (e o botão salvar) para fora do `<label>`, deixando nele um
texto explícito. Cobrir com teste que o input tenha nome acessível distinto do texto
dos segmentos.

## Triage

- Decision: `VALID`
- Notes: Causa raiz confirmada: o `<label>` sem texto envolve input + radiogroup,
  e o cálculo de nome acessível do label (excluindo o próprio input) resulta em
  "km h" — pior que o nome vazio pré-existente. Escolha da correção: `aria-label`
  explícito no input, porque é a mudança mínima, preserva o comportamento de
  clicar na linha para focar o campo e segue o padrão já usado no repo
  (`CardItem.tsx:99` monta `aria-label` com `${e.caption}`). Mover o radiogroup
  para fora do `<label>` foi considerado e reestruturaria o layout/foco sem
  necessidade. Fixture do teste tem `caption: 'Corrente'` → nome esperado
  "Limite de Corrente". Teste novo em `card-detail-modal.save.test.tsx`.
