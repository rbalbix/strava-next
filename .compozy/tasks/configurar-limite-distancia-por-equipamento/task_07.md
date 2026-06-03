---
status: pending
title: Criar `ThresholdAlertModal` e integrar em `ModalContainer`
type: frontend
complexity: medium
dependencies: [task_06]
---

## Overview

Adicionar um novo componente `src/components/ThresholdAlertModal.tsx` que mostra a lista de equipamentos vencidos com ações rápidas: `Ver equipamento` (navega para detalhe) e `Fechar`. Integrar este modal no `ModalContainer` com a chave `threshold-alert`.

<critical>
- O modal deve ser acessível (a11y) e responsivo.
- As mensagens devem estar em português conforme PRD.
</critical>

<requirements>
1. Component `ThresholdAlertModal` aceita props `{ items: Array<{gearId, equipmentId, label, distanceKm, thresholdKm}> }`.
2. `ModalContainer` deve mapear `'threshold-alert'` para este componente.
3. Modal deve permitir navegação para o detalhe do equipamento e fechar.
</requirements>

## Subtasks

- Criar `src/components/ThresholdAlertModal.tsx` com estilo consistente.
- Atualizar `src/components/ModalContainer.tsx` para suportar caso `threshold-alert`.
- Escrever testes de snapshot/component para o modal.

## Implementation Details

### Relevant Files

- `src/components/ModalContainer.tsx` — adicionar novo case.
- `src/components/ThresholdAlertModal.tsx` — novo arquivo.

### Dependent Files

- `src/components/Stats.tsx` — acionará a abertura do modal.

## Deliverables

- Componente modal funcional e integrado.
- Tests unitários e snapshot.

## Tests

- Unit: render do modal com 0, 1 e múltiplos itens.
- E2E (opcional): verificar fluxo de abertura no carregamento e navegação ao detalhe.

## Success Criteria

- Modal aparece quando `openModal('threshold-alert', ...)` for chamado.
- Testes de componente passam.
