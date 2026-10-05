---
status: completed
title: Endpoint aceita a unidade escolhida
type: backend
complexity: low
dependencies:
  - task_03
---

# Task 04: Endpoint aceita a unidade escolhida

## Overview

O schema do endpoint de limites é estrito, então qualquer campo novo precisa ser
declarado para não derrubar a requisição. Esta task abre o contrato da API para a
unidade escolhida pelo atleta, mantendo clientes com bundle cacheado funcionando —
quem não envia a unidade continua salvando limite em quilômetros.

<critical>
- LEIA o PRD e a TechSpec antes de começar (seção "API Endpoints").
- REFERENCIE a TechSpec para detalhes de implementação — não duplique aqui.
- FOQUE NO "QUE" — descreva o que precisa ser alcançado, não como.
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou pontos de problema.
- TESTES OBRIGATÓRIOS — esta task DEVE incluir testes nos entregáveis.
</critical>

<requirements>
- O schema da requisição DEVE aceitar a unidade como campo opcional restrito a
  `km`/`h`, com valor padrão de quilômetros quando ausente.
- O schema DEVE continuar estrito: campos desconhecidos continuam sendo rejeitados.
- `POST` sem a unidade DEVE persistir o limite como quilômetros (retrocompatibilidade
  de cliente antigo).
- `POST` com unidade de horas DEVE persistir horas.
- `POST` com unidade fora do conjunto permitido DEVE devolver `400 { error: 'Invalid payload' }`.
- `GET`, `401` e `405` DEVEM permanecer inalterados.
- `tests/unit/lib/apiClient.test.ts` DEVE cobrir a passagem da unidade no payload enviado.
</requirements>

## Subtasks

- [x] 4.1 Declarar a unidade no schema estrito da requisição, com padrão de quilômetros.
- [x] 4.2 Repassar a unidade parseada ao serviço de persistência.
- [x] 4.3 Cobrir no teste de integração a ausência da unidade, a unidade de horas e a inválida.
- [x] 4.4 Cobrir no teste do cliente de API o payload serializado com a unidade.

## Implementation Details

Siga a seção "API Endpoints" da TechSpec para o schema exato. O schema atual é
`.strict()` e o resultado do parse já é repassado ao serviço — a mudança é o campo
novo e o seu valor padrão.

A retrocompatibilidade é a razão de existir desta task: o app é servido como PWA e
roda em Capacitor, então clientes com bundle em cache continuam POSTando apenas o
valor. Isso precisa ser coberto por teste, não só por leitura de código.

### Relevant Files

- `src/pages/api/app/equipment-thresholds.ts` — schema da requisição e chamada ao serviço.

### Dependent Files

- `src/services/thresholds.ts` — já aceita o par valor+unidade desde a task 03.
- `src/lib/apiClient.ts` — sem alteração de código; coberto por teste nesta task.
- `tests/integration/equipment-thresholds.test.ts` — casos novos de unidade.

### Related ADRs

- [ADR-002: Modelo persistido `{ value, unit }` com normalização retrocompatível na leitura](adrs/adr-002.md) — a alternativa rejeitada de unidade obrigatória está registrada aqui.

## Deliverables

- Unidade aceita com padrão de quilômetros no schema estrito do endpoint.
- Três casos novos de integração (sem unidade, com horas, unidade inválida) **(OBRIGATÓRIO)**.
- Teste do cliente de API cobrindo o payload com unidade **(OBRIGATÓRIO)**.

## Tests

- Unit tests:
  - [x] Payload do cliente com `unit: 'h'` é serializado no corpo JSON do `POST`.
  - [x] Payload do cliente sem `unit` continua tipando e sendo enviado.
- Integration tests:
  - [x] `POST` autenticado sem a unidade chama o serviço com unidade de quilômetros e devolve 200.
  - [x] `POST` autenticado com a unidade de horas persiste horas e devolve 200.
  - [x] `POST` com unidade fora de `km`/`h` devolve 400 `{ error: 'Invalid payload' }`.
  - [x] `GET` autenticado continua devolvendo 200 com os limites.
  - [x] Requisição sem sessão continua devolvendo 401 e método não suportado devolve 405.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Cliente antigo (sem a unidade) continua salvando limite sem erro 400
- Unidade de horas persistida de ponta a ponta no serviço
