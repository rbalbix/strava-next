---
status: completed
title: Alerta de manutenção na unidade do limite
type: frontend
complexity: medium
dependencies:
  - task_02
  - task_03
---

# Task 05: Alerta de manutenção na unidade do limite

## Overview

O modal de alerta de manutenção hoje escreve "km" em strings fixas e compara sempre
distância. Esta task torna a superfície de alerta consciente da unidade: o item de
alerta passa a carregar a unidade e o valor consumido naquela unidade, e o modal
exibe `valor / limite` corretamente formatados para quilômetros ou horas.

<critical>
- LEIA o PRD e a TechSpec antes de começar (seções "Core Interfaces", "Data Models" e "Testing Approach").
- REFERENCIE a TechSpec para detalhes de implementação — não duplique aqui.
- FOQUE NO "QUE" — descreva o que precisa ser alcançado, não como.
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou pontos de problema.
- TESTES OBRIGATÓRIOS — esta task DEVE incluir testes nos entregáveis.
</critical>

<requirements>
- O tipo do item de alerta DEVE carregar a unidade e o valor consumido na unidade certa.
- O tipo DEVE ser consistente nos três pontos onde é declarado: montagem dos itens,
  componente do modal e payload inline do container de modais.
- A montagem dos itens DEVE usar a função de conversão da task 02 em vez de converter
  distância por conta própria.
- O gatilho do modal DEVE manter as regras atuais: somente estado vencido, somente
  limite maior que zero, e fechamento quando não restar nenhum item vencido.
- O modal DEVE exibir o valor atual e o limite com a unidade do item: uma casa decimal
  para horas e duas casas para quilômetros.
- O filtro do modal DEVE continuar descartando itens com limite menor ou igual a zero.
- Nenhuma superfície nova além do detalhe do equipamento e do modal de alerta.
</requirements>

## Subtasks

- [x] 5.1 Estender o tipo do item de alerta com unidade e valor consumido nos três locais de declaração.
- [x] 5.2 Fazer a montagem dos itens usar a função de conversão da task 02.
- [x] 5.3 Propagar a unidade no payload do modal.
- [x] 5.4 Trocar as strings fixas de quilômetros do modal pela unidade e formato corretos.
- [x] 5.5 Cobrir o gatilho do alerta com limite em horas, cenário que hoje não tem teste.
- [x] 5.6 Cobrir a formatação do modal nas duas unidades.

## Implementation Details

Siga a seção "Data Models" da TechSpec para o formato do item e "Testing Approach" para
os cenários exigidos. O tipo está declarado três vezes — em `Stats.tsx`,
`ThresholdAlertModal.tsx` e inline em `ModalContainer.tsx` — e mudar só uma das três
quebra o modal em runtime, não em compilação. Trate as três na mesma task.

A formatação usa o locale `d3` de `src/utils/format.ts` (`locale.format`), o mesmo que
já produz `1.234,56 km`. Para horas, use uma casa decimal com a unidade `h`.
Os badges de tempo do equipamento continuam no formato relógio atual — não os altere.

Atenção: `tests/unit/components/stats.test.tsx` hoje não cobre o gatilho do alerta e é
justamente o teste de maior valor desta task.

### Relevant Files

- `src/components/Stats.tsx` — montagem dos itens e gatilho do modal.
- `src/components/ThresholdAlertModal.tsx` — formatação `valor / limite` e filtro de itens.
- `src/components/ModalContainer.tsx` — tipo inline do payload do modal.
- `tests/unit/components/stats.test.tsx` — cobertura do gatilho.
- `tests/unit/components/threshold-alert-modal.test.tsx` — cobertura da formatação.

### Dependent Files

- `src/utils/thresholds.ts` — função de conversão consumida aqui (task 02).
- `src/contracts/api.ts` — par valor+unidade lido dos limites (task 03).
- `tests/integration/dashboard.test.ts` — regressão do payload que alimenta os itens.

### Related ADRs

- [ADR-003: Resolução do valor atual por helper puro compartilhado](adrs/adr-003.md) — fonte única do valor consumido usado aqui.
- [ADR-001: Limite por equipamento com unidade selecionável pelo usuário](adrs/adr-001.md) — define a apresentação `valor / limite` na unidade escolhida.

## Deliverables

- Item de alerta com unidade e valor consumido, consistente nos três locais.
- Modal exibindo `48,0 h / 50,0 h` para horas e o formato atual para quilômetros.
- Teste do gatilho do alerta com limite em horas **(OBRIGATÓRIO)**.
- Teste da formatação do modal nas duas unidades **(OBRIGATÓRIO)**.

## Tests

- Unit tests:
  - [x] Equipamento com limite em horas e tempo de pedalagem vencido abre o modal de alerta.
  - [x] Equipamento com limite em quilômetros e distância vencida continua abrindo o modal.
  - [x] Limite igual a zero não dispara o alerta.
  - [x] Item vencido deixa de ser alertado quando volta a ficar abaixo do limite.
  - [x] Modal exibe o valor atual e o limite com sufixo de horas e uma casa decimal.
  - [x] Modal exibe valor e limite com sufixo de quilômetros e duas casas decimais.
  - [x] Modal descarta item com limite menor ou igual a zero (caso existente continua verde).
  - [x] Modal vazio e fechamento continuam comportando como hoje.
- Integration tests:
  - [x] `tests/integration/dashboard.test.ts` continua verde com limites no formato novo.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Gatilho do alerta coberto para as duas unidades (hoje: zero cobertura)
- Nenhuma string fixa de quilômetros restante no modal de alerta
- Regras de disparo e fechamento idênticas às atuais
