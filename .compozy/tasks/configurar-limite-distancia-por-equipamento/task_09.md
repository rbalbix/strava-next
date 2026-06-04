---
status: completed
title: Testes unitários e de integração para API e componentes
type: test
complexity: medium
dependencies: [task_02, task_03, task_06, task_08]
---

## Overview

Criar e/ou estender a suíte de testes para cobrir:

- Serviço de thresholds (`src/services/thresholds.ts`).
- Endpoint `/api/app/equipment-thresholds` (GET/POST).
- `Stats.tsx` threshold logic (computeThresholdState) e fluxo de abertura do modal.
- `CardDetailModal` e `CardItem` UI (salvar threshold e progress bar).

<critical>
- Usar mocks para `redis` e chamadas HTTP onde aplicável.
- Testes devem rodar localmente com `yarn test` (Vitest/Jest conforme repo).
</critical>

<requirements>
1. Cobertura mínima para novos arquivos >= 80%.
2. Testes de integração para as rotas usando handlers Next.js (sem subir servidor).
3. Component tests para modal e itens usando test renderer (Vitest + React Testing Library).
</requirements>

## Subtasks

- Adicionar testes unitários para `src/services/thresholds.ts` (mocks redis).
- Adicionar testes de integração para `src/pages/api/app/equipment-thresholds.ts`.
- Adicionar testes para `computeThresholdState` e `Stats.tsx` comportamento de trigger.
- Adicionar testes para `CardDetailModal` salvar fluxo.

## Implementation Details

### Relevant Files (tests)

- `tests/unit/thresholds.spec.ts`
- `tests/integration/api-equipment-thresholds.spec.ts`
- `tests/unit/computeThresholdState.spec.ts`
- `tests/unit/CardItem.spec.tsx`

## Deliverables

- Arquivos de testes adicionados.
- Pipeline local (`yarn test`) passa.

## Success Criteria

- Testes passam localmente.
- Novos códigos têm cobertura mínima aceitável.
