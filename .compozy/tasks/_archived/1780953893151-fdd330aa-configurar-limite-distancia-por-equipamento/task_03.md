---
status: completed
title: "Endpoint API `/api/app/equipment-thresholds` (GET/POST)"
type: backend
complexity: medium
dependencies: [task_01, task_02]
---

# Endpoint API `/api/app/equipment-thresholds` (GET/POST)

## Overview

Criar o endpoint REST em `src/pages/api/app/equipment-thresholds.ts` que permite ao cliente obter e salvar limites de equipamento do atleta autenticado. O endpoint delega leitura/gravação ao serviço `src/services/thresholds.ts`.

<critical>
- Validar autenticação com `getAuthenticatedAthleteId(req)`.
- Validar o payload do POST (tipos/valores) antes de persistir.
- Incluir testes de integração para GET e POST.
</critical>

<requirements>
1. GET /api/app/equipment-thresholds deve retornar `{ equipmentThresholds: EquipmentThresholds }` com status 200 para atleta autenticado.
2. POST /api/app/equipment-thresholds deve aceitar `{ gearId, equipmentId, thresholdKm }` e retornar o objeto atualizado.
3. Requests sem autenticação devem retornar 401.
4. Payload inválido deve retornar 400.
</requirements>

## Subtasks

- Criar `src/pages/api/app/equipment-thresholds.ts` com handlers GET e POST.
- Usar `thresholds` service para realizar operações.
- Adicionar validação de payload com zod ou checagem manual.
- Adicionar testes de integração simulando requests autenticados e não autenticados.

## Implementation Details

### Relevant Files

- `src/services/thresholds.ts` — serviço para CRUD (task_02).
- `src/server/auth.ts` — função `getAuthenticatedAthleteId` para validação.
- `src/services/redis.ts` — cliente Redis.

### Dependent Files

- `src/lib/apiClient.ts` — será atualizado para chamar este endpoint.
- `src/components/Stats.tsx` — consumirá os dados via dashboard ou endpoint.

### Related ADRs

- `adrs/adr-002.md` — define a existência deste endpoint.

## Deliverables

- Endpoint funcional `src/pages/api/app/equipment-thresholds.ts` com GET e POST.
- Testes de integração cobrindo autenticação e payload.

## Tests

- Integration: GET retorna 200 com objeto quando autenticado.
- Integration: POST atualiza e retorna objeto atualizado.
- Integration: 401 para requests sem auth.
- Validation: 400 para payload inválido.

## Success Criteria

- Endpoints passam nos testes de integração.
- Código segue padrões existentes de API do projeto.
