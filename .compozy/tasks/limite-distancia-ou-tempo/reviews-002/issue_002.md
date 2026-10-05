---
provider: manual
pr:
round: 2
round_created_at: 2026-10-04T21:42:03Z
status: resolved
file: src/components/ThresholdAlertModal.tsx
line: 108
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Linhas do alerta com role='button' não ativam por teclado

## Review Comment

A row do item no modal de alerta (linhas 105-112) é um `<div>` com `onClick`,
`role='button'`, `tabIndex={0}` e `aria-label`, mas **sem `onKeyDown`** — o
arquivo inteiro não tem nenhum handler de teclado. Enter e Space não ativam
`onViewEquipment`: quem alcança a linha por Tab (o focus trap do modal leva o
foco até ela) vê "Ver detalhes de …" anunciado como botão, mas não consegue
acioná-lo — falha WCAG 2.1.1 ( operação por teclado ) numa superfície que o PRD
trata como requisito ("o modal de alerta").

Verificado antes de flagrar: nenhum comentário/intenção documentada justifica a
ausência; os testes existentes (`threshold-alert-modal.test.tsx:86-91`,
`modal-related.test.tsx`) só disparam `fireEvent.click`, então nenhum cobre
teclado. O `role='button'` é pré-existente (está no HEAD), mas esta rodada é a
primeira a trackear o problema e o modal é superfície da feature.

Correção sugerida — preferencialmente um `<button type='button'>` real (ganha
ativação nativa + estilo de foco), ou mantendo o div:

```tsx
onKeyDown={(ev) => {
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    onViewEquipment(item.gearId);
  }
}}
```

Adicionar teste que dispare `keyDown` Enter na linha e espere a chamada de
`onViewEquipment`.

## Triage

- Decision: `VALID`
- Notes: Causa raiz confirmada: a row é `<div onClick role='button' tabIndex={0}>` (linhas 105-111) sem `onKeyDown` em todo o arquivo — Enter/Space nãoativam `onViewEquipment`, embora o focus trap torne a row alcançável por Tab. Sem justificativa documentada; testes existentes só disparam mouse. Correção escolhida: manter o div e adicionar `onKeyDown` com Enter/Space (`preventDefault` + `onViewEquipment`) — conversão para `<button>` real foi considerada e rejeitada nesta rodada porque mudaria o layout/default styles do `.item` sem possibilidade de verificação visual neste ambiente; documentado aqui para reavaliar. Teste novo em `threshold-alert-modal.test.tsx` disparam `keydown` Enter e Space.
