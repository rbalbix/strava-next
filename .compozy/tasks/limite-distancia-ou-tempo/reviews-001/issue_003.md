---
provider: manual
pr:
round: 1
round_created_at: 2026-10-03T23:21:17Z
status: resolved
file: src/components/CardItem.tsx
line: 17
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Formatação por unidade duplicada entre progresso e alerta

## Review Comment

`formatThresholdValue` (`src/components/CardItem.tsx:17`) e `formatItemValue`
(`src/components/ThresholdAlertModal.tsx:41`) são logicamente idênticos:

```ts
`${locale.format(unit === 'h' ? ',.1f' : ',.2f')(value)} ${unit}`
```

ambos com comentário explicando a mesma regra do PRD (duas casas para km, uma para
horas). A composição do par `atual / limite` também é duplicada
(`CardItem.tsx:86` e `ThresholdAlertModal.tsx:133-135`).

Por que é problemático: o PRD O2 exige que "progresso e alertas avaliam e apresentam
o valor na unidade escolhida, sem ambiguidade" — e são exatamente essas duas
superfícies. Se a regra de casas mudar (ex.: horas com duas casas) num arquivo e não
no outro, barra de progresso e modal de alerta divergiriam silenciosamente, que é
precisamente o tipo de duplicação silenciosa que o ADR-003 rejeitou para a conversão
de consumo.

Sugestão de correção — extrair um único helper, ex.
`formatThresholdValue(value: number, unit: ThresholdUnit): string` (e, se fizer
sentido, `formatThresholdPair(current, limit, unit)`) para
`src/utils/thresholds.ts` ou `src/utils/format.ts`, e importá-lo nos dois
componentes. Os testes existentes de `card-item.progress.test.tsx` e
`threshold-alert-modal.test.tsx` já servem de guarda para a refatoração.

## Triage

- Decision: `VALID`
- Notes: Causa raiz confirmada: a regra de casas por unidade está escrita uma vez
  por superfície, com comentários idênticos. Correção: extrair
  `formatThresholdValue(value, unit)` para `src/utils/thresholds.ts` (casa do
  helper compartilhado do ADR-003, ao lado de `resolveCurrentConsumption`) e
  importar nos dois componentes, apagando `formatThresholdValue` local do
  `CardItem` e `formatItemValue` do `ThresholdAlertModal`. A helper de PAR
  (`formatThresholdPair`) NÃO foi extraída: a marcação do alerta envolve
  `current` em `<span className={styles.limitConfigured}>` e o do `CardItem` é
  string simples — a composição não é idêntica e unificá-la forçaria markup; o
  risco real (regra de casas) fica resolvido. Testes diretos novos em
  `tests/unit/utils/thresholds.test.ts` + guards existentes de
  `card-item.progress.test.tsx` e `threshold-alert-modal.test.tsx`.
