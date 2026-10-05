---
status: completed
title: Tipos de unidade do limite
type: refactor
complexity: low
dependencies: []
---

# Task 01: Tipos de unidade do limite

## Overview

Esta task introduz os tipos de domínio que sustentam a unidade variável — a unidade
(`km` ou `h`) e o par valor+unidade — dentro do contrato compartilhado, sem alterar
nenhuma estrutura existente. Ela é a fundação tipada das demais tasks: nada muda em
tempo de execução, mas todas as próximas tasks passam a poder declarar esses tipos.

<critical>
- LEIA o PRD e a TechSpec antes de começar (seções "Core Interfaces" e "Data Models").
- REFERENCIE a TechSpec para detalhes de implementação — não duplique aqui.
- FOQUE NO "QUE" — descreva o que precisa ser alcançado, não como.
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou pontos de problema.
- TESTES OBRIGATÓRIOS — esta task DEVE incluir testes nos entregáveis.
</critical>

<requirements>
- `src/contracts/api.ts` DEVE exportar um tipo de unidade restrito a `'km' | 'h'`.
- `src/contracts/api.ts` DEVE exportar o par valor+unidade com `value: number` e a unidade acima.
- `EquipmentThresholdsRequest` DEVE ganhar a unidade como campo opcional, de modo que
  payloads antigos (sem a unidade) continuem tipando corretamente.
- `EquipmentThresholds` DEVE permanecer inalterado nesta task — a migração do formato
  armazenado acontece na task 03.
- `yarn typecheck` DEVE continuar passando sem nenhuma alteração fora de
  `src/contracts/api.ts` e dos testes desta task.
- Nenhuma mudança de comportamento em tempo de execução é permitida.
</requirements>

## Subtasks

- [x] 0.1 Adicionar o tipo de unidade e o par valor+unidade em `src/contracts/api.ts`.
- [x] 0.2 Adicionar a unidade opcional ao tipo de request de limites.
- [x] 0.3 Exportar os dois tipos novos no bloco de exports do contrato.
- [x] 0.4 Acrescentar um teste que garanta a unidade faz parte do payload de escrita.

## Implementation Details

Siga a seção "Core Interfaces" da TechSpec para a forma exata dos tipos. Os tipos de
threshold neste contrato são literais TypeScript (não são inferidos de zod) e vivem
próximos de `EquipmentThresholdsRequest` e `EquipmentThresholdsResponse`.

Não altere `EquipmentThresholds` — seu valor continua sendo número puro até a task 03.
Isso mantém `src/services/thresholds.ts`, `Stats.tsx`, `CardDetailModal.tsx` e todos os
testes existentes compilando e passando sem tocar emles.

### Relevant Files

- `src/contracts/api.ts` — único arquivo de código alterado; é onde vivem os tipos de threshold.

### Dependent Files

- `src/services/thresholds.ts` — consumirá o par valor+unidade na task 03.
- `src/pages/api/app/equipment-thresholds.ts` — passará a validar a unidade na task 04.
- `src/utils/thresholds.ts` — o helper da task 02 recebe o par valor+unidade.
- `src/lib/apiClient.ts` — repassa o payload de escrita já com a unidade opcional.

### Related ADRs

- [ADR-002: Modelo persistido `{ value, unit }` com normalização retrocompatível na leitura](adrs/adr-002.md) — define a forma do par que esta task declara.

## Deliverables

- Tipos de unidade e de par valor+unidade exportados por `src/contracts/api.ts`.
- `EquipmentThresholdsRequest` com a unidade opcional.
- Teste cobrindo a passagem da unidade no payload de escrita **(OBRIGATÓRIO)**.
- `yarn typecheck` verde sem alterações em consumidores.

## Tests

- Unit tests:
  - [x] Payload de escrita incluindo `unit: 'h'` tipa como request e serializa o campo no corpo JSON.
  - [x] Payload de escrita sem `unit` continua tipando como request (retrocompatibilidade do tipo).
  - [x] Literais `km` e `h` são aceitos como unidade; `minutos` é rejeitado pelo compilador.
- Integration tests:
  - [x] `tests/unit/lib/apiClient.test.ts` permanece verde e cobre o payload com a unidade.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `yarn typecheck` sem erros novos
- Nenhum arquivo fora de `src/contracts/api.ts` (e testes) modificado
- Nenhuma mudança de comportamento observável na aplicação
