---
status: pending
title: Editar/Salvar limite no `CardDetailModal` e exibir progresso em `CardItem`
type: frontend
complexity: medium
dependencies: [task_05, task_06]
---

## Overview

Adicionar UI para editar o limite de distância dentro do modal de detalhe do equipamento (`CardDetailModal.tsx`) e exibir uma barra compacta de progresso em `CardItem.tsx` que indica `normal`, `warning` e `overdue` com cores/tooltip conforme PRD.

<critical>
- Alterações de UI devem ser internacionais em pt-BR (labels e mensagens).
- Salvar deve chamar `saveEquipmentThreshold` e refletir no estado local e no dashboard quando bem-sucedido.
</critical>

<requirements>
1. `CardDetailModal` deve exibir o campo `Limite de revisão (km)` com valor atual ou placeholder `Sem limite definido`.
2. Ao salvar, chamar `POST /api/app/equipment-thresholds` e atualizar o estado.
3. `CardItem` exibe progress bar com percentual `distanceAccumulated / thresholdKm` e cor:
   - normal: neutro (<=80%)
   - warning: amarelo (>80% e <100%)
   - overdue: vermelho (>=100%)
4. Quando não há threshold, mostrar `—` ou `Sem limite definido`.
</requirements>

## Subtasks

- Atualizar `src/components/CardDetailModal.tsx` para incluir campo de edição e salvar.
- Atualizar `src/components/CardItem.tsx` para renderizar a barra de progresso compacta.
- Atualizar ou adicionar pequenos helper hooks (`useSaveThreshold`) se necessário.
- Implementar testes de UI para salvar e exibir progresso.

## Implementation Details

### Relevant Files

- `src/components/CardDetailModal.tsx` — editar para salvar threshold.
- `src/components/CardItem.tsx` — adicionar progress bar.
- `src/lib/apiClient.ts` — já atualizado em task_05.

### Dependent Files

- `src/components/Stats.tsx` — pode precisar de re-render após salvar.

## Deliverables

- UI para editar e salvar limites por equipamento.
- Barra de progresso funcional em `CardItem`.
- Testes de componente.

## Tests

- Unit: salvar threshold atualiza UI; mock `saveEquipmentThreshold`.
- Visual: snapshot do `CardItem` em cada estado (normal, warning, overdue, no-threshold).

## Success Criteria

- Usuário consegue salvar limite no modal e ver barra de progresso atualizada.
- Testes passam e não há regressões visuais críticas.
