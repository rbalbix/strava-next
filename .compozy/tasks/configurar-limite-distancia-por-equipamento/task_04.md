---
status: pending
title: Incluir `equipmentThresholds` no payload de `/api/app/dashboard`
type: backend
complexity: medium
dependencies: [task_02, task_03]
---

## Overview

Modificar o endpoint `src/pages/api/app/dashboard.ts` para incluir `equipmentThresholds` no `DashboardResponse` retornado ao cliente. Isso evita chamadas separadas e mantém o carregamento inicial num único request.

<critical>
- Não alterar a estrutura existente do `DashboardResponse` além de adicionar o campo opcional `equipmentThresholds`.
- Garantir compatibilidade retroativa: o campo deve ser opcional e o cliente precisa tratar ausência do mesmo.
- Incluir testes que verifiquem presença do campo quando thresholds existem.
</critical>

<requirements>
1. `DashboardResponse` MUST ser estendido para incluir `equipmentThresholds?: EquipmentThresholds`.
2. `src/pages/api/app/dashboard.ts` MUST chamar o service `getEquipmentThresholds(athleteId)` e anexar o resultado ao payload.
3. Em caso de erro ao buscar thresholds, o endpoint não deve falhar; apenas logar o erro e retornar payload sem o campo.
</requirements>

## Subtasks

- Atualizar `src/contracts/api.ts` com o novo campo (task_05 dependerá disso).
- Modificar `src/pages/api/app/dashboard.ts` para obter thresholds via service.
- Atualizar testes para validar novo campo opcional.

## Implementation Details

### Relevant Files

- `src/pages/api/app/dashboard.ts` — modificar para incluir thresholds.
- `src/services/thresholds.ts` — método `getEquipmentThresholds`.
- `src/contracts/api.ts` — estender `DashboardResponse`.

### Dependent Files

- `src/components/Stats.tsx` — consumirá o campo e atualizará o UI.
- `src/lib/apiClient.ts` — tipagem e cliente para dashboard.

### Related ADRs

- `adrs/adr-002.md` — refere persistência e inclusão no dashboard.

## Deliverables

- Endpoint `dashboard` retornando `equipmentThresholds` quando disponível.
- Testes atualizados garantindo compatibilidade.

## Tests

- Integration: `GET /api/app/dashboard` inclui `equipmentThresholds` quando dados existem.
- Edge: endpoint retorna 200 mesmo se leitura de thresholds falhar.

## Success Criteria

- Dashboard endpoint passa nos testes e `equipmentThresholds` é opcional no payload.
