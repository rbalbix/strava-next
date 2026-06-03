---
status: completed
title: Criar serviço de persistência `thresholds` (Redis)
type: backend
complexity: medium
dependencies: [task_01]
---

## Overview

Criar um pequeno serviço em `src/services/thresholds.ts` que encapsula leitura e gravação dos limites de equipamento no Redis. Isso centraliza a lógica e facilita testes e reutilização pelo endpoint e pelo dashboard.

<critical>
- Leia o TechSpec `Core Interfaces` e `API e Persistência` antes de implementar.
- Este serviço deve ser minimalista e responsável apenas por CRUD de thresholds.
- Incluir testes unitários cobrindo leitura, escrita e comportamento de chave vazia.
</critical>

<requirements>
1. MUST export `getEquipmentThresholds(athleteId: number): Promise<EquipmentThresholds>`.
2. MUST export `saveEquipmentThreshold(athleteId: number, gearId: string, equipmentId: string, thresholdKm: number): Promise<EquipmentThresholds>`.
3. MUST use `redis` importado de `src/services/redis` and `REDIS_KEYS.equipmentThresholds` from `src/config/index.ts`.
4. MUST validate inputs and throw errors for invalid values (e.g., negative `thresholdKm`).
</requirements>

## Subtasks

- Criar `src/services/thresholds.ts` com os dois métodos públicos.
- Implementar leitura (`redis.get`) e escrita (`redis.set`) do objeto JSON.
- Adicionar testes unitários simulando `redis` com mock.

## Implementation Details

### Relevant Files

- `src/services/redis.ts` — cliente Redis já existente.
- `src/config/index.ts` — para `REDIS_KEYS.equipmentThresholds`.

### Dependent Files

- `src/pages/api/app/equipment-thresholds.ts` — consumirá este serviço.
- `src/pages/api/app/dashboard.ts` — lerá thresholds via este serviço.

### Related ADRs

- `adrs/adr-002.md` — persistência no Redis.

## Deliverables

- `src/services/thresholds.ts` implementado com métodos exportados.
- Testes unitários cobrindo leitura/escrita e validação de entrada.

## Tests

- Unit: chamar `getEquipmentThresholds` com athleteId válido retorna objeto (ou `{}` se vazio).
- Unit: `saveEquipmentThreshold` grava e retorna objeto atualizado.
- Edge: `saveEquipmentThreshold` com `thresholdKm` negativo retorna erro de validação.

## Success Criteria

- Testes unitários passam e cobertura para o arquivo é >= 80%.
- Serviço é reutilizável por endpoints e componentes do servidor.
