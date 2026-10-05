---
status: completed
title: Helper puro de consumo do limite
type: frontend
complexity: low
dependencies:
  - task_01
---

# Task 02: Helper puro de consumo do limite

## Overview

Com a unidade variável, cada superfície precisa responder "qual é o valor consumido
deste limite agora?" e a resposta depende da unidade escolhida. Esta task cria essa
regra como função pura única, para que o alerta e a barra de progresso jamais divergam.
É a peça que permite testar a conversão sem React nem Redis.

<critical>
- LEIA o PRD e a TechSpec antes de começar (seções "Core Interfaces" e "Key Decisions").
- REFERENCIE a TechSpec para detalhes de implementação — não duplique aqui.
- FOQUE NO "QUE" — descreva o que precisa ser alcançado, não como.
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou pontos de problema.
- TESTES OBRIGATÓRIOS — esta task DEVE incluir testes nos entregáveis.
</critical>

<requirements>
- A nova função DEVE viver em `src/utils/thresholds.ts`, ao lado de `computeThresholdState`.
- DEVE receber o par valor+unidade e o equipamento, e devolver o valor atual já
  convertido para a unidade do limite.
- Para a unidade de distância DEVE usar a distância acumulada em metros dividida por 1000.
- Para a unidade de tempo DEVE usar o tempo de pedalagem acumulado em segundos dividido
  por 3600 (horas).
- DEVE devolver `0` quando a grandeza relevante do equipamento estiver ausente.
- `computeThresholdState` NÃO pode mudar de assinatura nem de comportamento.
- A função DEVE ser pura: sem React, sem Redis, sem efeitos colaterais.
</requirements>

## Subtasks

- [x] 2.1 Declarar a função de conversão em `src/utils/thresholds.ts`.
- [x] 2.2 Implementar a conversão por unidade com fallback para `0`.
- [x] 2.3 Preservar `computeThresholdState` intocado.
- [x] 2.4 Cobrir a função com testes unitários nas duas unidades e nos casos-limite.

## Implementation Details

Siga a seção "Core Interfaces" da TechSpec para a assinatura prevista. A regra é a
segunda que vive neste módulo — `computeThresholdState` continua sendo o ponto de
entrada natural para o cálculo de estado, e as tasks 05 e 06 vão compor as duas funções
(a conversão devolve o valor, o cálculo devolve a faixa).

O dado de entrada já existe: `Equipment` em `src/services/equipment.ts` declara
`distance` (metros) e `movingTime` (segundos), ambos acumulados desde a última
manutenção por `src/services/statistics.ts`. Nenhuma medição nova é necessária.

### Relevant Files

- `src/utils/thresholds.ts` — módulo que ganha a nova função pura.

### Dependent Files

- `src/components/Stats.tsx` — usará a função para montar os itens de alerta (task 05).
- `src/components/CardItem.tsx` — usará a função para largura e estado da barra (task 06).
- `tests/unit/utils/thresholds.test.ts` — arquivo de teste existente a estender.

### Related ADRs

- [ADR-003: Resolução do valor atual por helper puro compartilhado](adrs/adr-003.md) — decisão de colocar esta regra em um único helper puro.

## Deliverables

- Nova função de conversão exportada por `src/utils/thresholds.ts`.
- `computeThresholdState` inalterado.
- Testes unitários cobrindo as duas unidades e os campos ausentes **(OBRIGATÓRIO)**.
- Suíte existente de `computeThresholdState` continuando verde **(OBRIGATÓRIO)**.

## Tests

- Unit tests:
  - [x] Unidade de distância: par com `km` devolve a distância em metros dividida por 1000.
  - [x] Unidade de tempo: par com `h` devolve o tempo de pedalagem em segundos dividido por 3600.
  - [x] Equipamento sem distância e unidade `km` devolve `0`.
  - [x] Equipamento sem tempo de pedalagem e unidade `h` devolve `0`.
  - [x] Equipamento com as duas grandezas e unidade `h` ignora a distância.
  - [x] Os 5 casos existentes de `computeThresholdState` continuam passando.
- Integration tests:
  - [x] `tests/unit/components/card-item.progress.test.tsx` e `tests/unit/components/stats.test.tsx` permanecem verdes (nenhum consumidor alterado nesta task).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Função testável sem React nem Redis
- `computeThresholdState` sem nenhuma alteração de assinatura ou de resultado
