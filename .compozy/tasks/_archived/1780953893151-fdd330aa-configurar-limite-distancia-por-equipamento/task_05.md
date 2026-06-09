---
status: completed
title: "Atualizar `contracts/api.ts` e `lib/apiClient.ts` para suportar thresholds"
type: frontend
complexity: low
dependencies: [task_04]
---

# Atualizar `contracts/api.ts` e `lib/apiClient.ts` para suportar thresholds

## Overview

Estender os tipos em `src/contracts/api.ts` para descrever `EquipmentThresholds` e adicionar métodos em `src/lib/apiClient.ts` para obter e salvar thresholds (`getEquipmentThresholds`, `saveEquipmentThreshold`) caso o cliente precise usar o endpoint diretamente.

<critical>
- Manter compatibilidade com os tipos existentes do `DashboardResponse`.
- As funções do cliente devem usar os mesmos paths e contratos do endpoint implementado na task_03.
</critical>

<requirements>
1. `EquipmentThresholds` type: Map<{ gearId: { equipmentId: number } }> ou similar conforme TechSpec.
2. `DashboardResponse` atualizado com `equipmentThresholds?: EquipmentThresholds`.
3. `lib/apiClient.ts` exporta `getEquipmentThresholds(): Promise<EquipmentThresholds>` e `saveEquipmentThreshold(payload): Promise<EquipmentThresholds>`.
</requirements>

## Subtasks

- Atualizar `src/contracts/api.ts` com os tipos.
- Atualizar `src/lib/apiClient.ts` com as funções e testes unitários (mock axios/fetch).

## Implementation Details

### Relevant Files

- `src/contracts/api.ts` — tipos.
- `src/lib/apiClient.ts` — chamadas HTTP.

### Dependent Files

- `src/components/Stats.tsx`, `CardDetailModal.tsx` — usarão essas funções.

## Deliverables

- Tipos atualizados e funções cliente adicionadas.
- Testes unitários simples das funções do cliente (mocks).

## Tests

- Unit: mock `fetch/axios` para `getEquipmentThresholds` e `saveEquipmentThreshold`, assert chamar a URL correta e tratar respostas.

## Success Criteria

- Tipos compilam (TS) e cliente passa nos testes.
