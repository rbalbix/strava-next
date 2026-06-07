---
status: completed
title: Atualizar `REDIS_KEYS` com `equipmentThresholds`
type: backend
complexity: low
dependencies: []
---

## Overview

Adicionar uma nova chave de Redis em `src/config/index.ts` para armazenar os limites de equipamento por atleta como `strava:equipment-thresholds:<athleteId>`. Esta tarefa prepara o ambiente para armazenar e ler os thresholds a partir do servidor.

<critical>
- Leia o PRD e TechSpec na pasta da task.
- Esta tarefa modifica apenas `src/config/index.ts` e não deve incluir lógica de leitura/escrita no Redis.
- Testes são obrigatórios: validação do valor da chave exportada.
</critical>

<requirements>
1. O arquivo `src/config/index.ts` MUST export `REDIS_KEYS.equipmentThresholds` como função que recebe `athleteId: number` e retorna a chave string.
2. A nova chave MUST seguir o padrão `strava:equipment-thresholds:${athleteId}`.
3. Não alterar outras chaves existentes sem necessidade.
</requirements>

## Subtasks

- Abrir `src/config/index.ts`.
- Adicionar `equipmentThresholds` ao objeto `REDIS_KEYS`.
- Executar `yarn test` (ou rodar tipos) para validar que não houve quebra.

## Implementation Details

### Relevant Files

- `src/config/index.ts` — local a modificar.

### Dependent Files

- `src/pages/api/app/equipment-thresholds.ts` (será criado na task_03).
- `src/pages/api/app/dashboard.ts` (será atualizado na task_04).

### Related ADRs

- `adrs/adr-002.md` — Armazenar limites de equipamento no Redis e usar modal independente de alerta.

## Deliverables

- `src/config/index.ts` atualizado com `equipmentThresholds`.
- Testes locais passando (lint/TS type check).

## Tests

- Unit: Import `REDIS_KEYS` and assert `REDIS_KEYS.equipmentThresholds(123) === 'strava:equipment-thresholds:123'`.

## Success Criteria

- O projeto compila (TS) e os testes relevantes passam localmente.
- A chave está documentada na task e referenciada em ADR-002.
