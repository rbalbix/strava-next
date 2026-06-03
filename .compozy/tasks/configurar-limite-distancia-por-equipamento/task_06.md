---
status: pending
title: Carregar thresholds em `Stats.tsx` e acionar lógica de alerta
type: frontend
complexity: medium
dependencies: [task_05]
---

## Overview

Modificar `src/components/Stats.tsx` para extrair `equipmentThresholds` do `DashboardResponse` (ou via `getEquipmentThresholds`) e identificar equipamentos cujo `distanceAccumulated >= thresholdKm`. Quando existirem equipamentos vencidos, disparar uma action que abre o `ThresholdAlertModal` via `ModalContainer` (ou Toast/Context). O modal só aparece no login/boot strap do dashboard.

<critical>
- Não bloquear render se thresholds não estiverem presentes; tratar como `Sem limite definido`.
- O cálculo do progresso deve usar distância atual (já computada em `statistics`) e o threshold salvo.
</critical>

<requirements>
1. `Stats.tsx` deve obter `equipmentThresholds` do objeto `dashboard` fornecido pelo backend.
2. Deve detectar equipamentos em estado `warning` (>=80% do threshold) e `overdue` (>=100%).
3. Disparar modal `threshold-alert` ao detectar qualquer `overdue` no carregamento inicial.
</requirements>

## Subtasks

- Atualizar `Stats.tsx` para usar o novo campo do dashboard.
- Implementar função utilitária `computeThresholdState(distanceKm, thresholdKm)` que retorna `normal|warning|overdue|no-threshold`.
- Em caso de `overdue`, chamar `openModal('threshold-alert', { items: [...] })` via `ModalContainer` ou `ToastContext` padrão.

## Implementation Details

### Relevant Files

- `src/components/Stats.tsx` — atualização principal.
- `src/components/ModalContainer.tsx` — integração com modal (task_07).
- `src/services/statistics.ts` — fonte de `distanceAccumulated` por equipamento.

### Dependent Files

- `src/components/ThresholdAlertModal.tsx` — novo componente que mostrará a lista de equipamentos vencidos.

## Deliverables

- `Stats.tsx` atualizado com lógica de threshold e trigger do modal.
- Utilitário `computeThresholdState` com testes unitários.

## Tests

- Unit: `computeThresholdState` para vários cenários (0%, 79%, 80%, 100%, sem threshold).
- Integration (opcional): Simular `DashboardResponse` com thresholds e assegurar modal é aberto quando apropriado.

## Success Criteria

- Lógica corretamente classifica equipamentos e dispara modal apenas quando devido.
