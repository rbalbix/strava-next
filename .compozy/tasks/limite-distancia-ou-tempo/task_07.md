---
status: completed
title: Editor de limite com seletor km ou horas
type: frontend
complexity: medium
dependencies:
  - task_04
  - task_06
---

# Task 07: Editor de limite com seletor km ou horas

## Overview

Esta é a task em que o atleta ganha a escolha. O editor de limite existente passa a
ter um seletor de duas opções na mesma linha do campo de valor, sem acrescentar altura
ao modal; a unidade escolhida vai junto na requisição de salvamento, e trocar de
unidade limpa o valor digitado para que um número em quilômetros nunca vire
silenciosamente um número de horas.

<critical>
- LEIA o PRD e a TechSpec antes de começar (seções "Data Models" (estado do editor), "User Experience" e "Key Decisions").
- REFERENCIE a TechSpec para detalhes de implementação — não duplique aqui.
- FOQUE NO "QUE" — descreva o que precisa ser alcançado, não como.
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou pontos de problema.
- TESTES OBRIGATÓRIOS — esta task DEVE incluir testes nos entregáveis.
</critical>

<requirements>
- O editor DEVE manter a unidade escolhida por equipamento em estado próprio,
  inicializado pela unidade do limite salvo, e como quilômetros quando não há limite.
- Ao abrir o editor, DEVE pré-preencher o valor e a unidade salvos.
- Trocar a unidade DEVE limpar o valor do campo e pedir um novo — nunca reinterpretar
  o número já digitado ou salvo.
- Ao salvar, DEVE enviar valor e unidade juntos na requisição.
- O passo do campo DEVE seguir a unidade: centenas para quilômetros e unidades inteiras
  para horas.
- O placeholder do campo NÃO pode fixar a unidade — ela fica visível no seletor.
- O seletor DEVE ter semântica de grupo de opções, navegação por setas, anel de foco
  visível, e DEVE ocupar a mesma linha do campo sem aumentar a altura da linha.
- Salvar valor zero DEVE continuar removendo o limite, como hoje.
- O editor DEVE aparecer apenas para atividades de bicicleta, como hoje.
</requirements>

## Subtasks

- [x] 7.1 Adicionar o estado de unidade por equipamento, inicializado pelo limite salvo.
- [x] 7.2 Limpar o valor do campo quando a unidade for trocada.
- [x] 7.3 Enviar valor e unidade no salvamento e manter a remoção por zero.
- [x] 7.4 Ajustar o passo e o placeholder conforme a unidade ativa.
- [x] 7.5 Renderizar o seletor de duas opções na linha do campo, com semântica acessível.
- [x] 7.6 Pré-preencher valor e unidade ao abrir o editor.
- [x] 7.7 Cobrir pré-preenchimento, troca de unidade, envio e teclado.

## Implementation Details

Siga a seção "Data Models" para o estado do editor e "Core Interfaces" para o formato
do payload de escrita. O editor é filho do componente da lista de equipamentos e herda
a largura da linha existente — o campo tem largura fixa hoje e precisa ficar flexível
para caber o seletor; o ajuste visual fino é a task 08, mas o DOM precisa já acomodar
os três elementos lado a lado.

Este é o primeiro controle do tipo grupo de opções do aplicativo: não existe padrão a
seguir, então estabeleça um e registre-o no próprio componente. O contêiner de modais
já inclui campos e áreas focáveis no rastreio de foco, então o seletor participa do
trap de foco sem mudança extra.

A validação da requisição é feita no servidor (task 04) — o campo aqui apenas envia o
valor digitado com a unidade ativa.

### Relevant Files

- `src/components/CardDetailModal.tsx` — estado do editor, salvamento, teclado e JSX do seletor.
- `tests/unit/components/card-detail-modal.save.test.tsx` — cobertura do salvamento.

### Dependent Files

- `src/lib/apiClient.ts` — repassa o payload já com a unidade, sem alteração de código.
- `src/styles/components/CardDetailModal.module.css` — acomoda o seletor (task 08).
- `src/components/CardItem.tsx` — recebe o editor como filho; prop já migrada (task 06).

### Related ADRs

- [ADR-001: Limite por equipamento com unidade selecionável pelo usuário](adrs/adr-001.md) — define o seletor na mesma linha e a limpeza do valor ao trocar a unidade.
- [ADR-002: Modelo persistido `{ value, unit }` com normalização retrocompatível na leitura](adrs/adr-002.md) — a unidade enviada aqui é a que o serviço persiste.

## Deliverables

- Seletor de duas opções na linha do campo, sem ganho de altura.
- Estado de unidade por equipamento com pré-preenchimento do limite salvo.
- Limpeza de valor ao trocar de unidade e envio da unidade no salvamento.
- Passo e placeholder conforme a unidade ativa.
- Testes de pré-preenchimento, troca, envio e teclado **(OBRIGATÓRIO)**.

## Tests

- Unit tests:
  - [x] Abrir o editor com limite salvo em quilômetros pré-preenche valor e unidade de quilômetros.
  - [x] Abrir o editor sem limite começa com a unidade de quilômetros e campo vazio.
  - [x] Trocar a unidade limpa o valor digitado no campo.
  - [x] Salvar com a unidade de horas envia o valor com a unidade de horas.
  - [x] Salvar com a unidade de quilômetros envia o valor com a unidade de quilômetros.
  - [x] Salvar valor zero continua removendo o limite e mostrando o toast de remoção.
  - [x] As setas alternam o segmento ativo do seletor.
  - [x] O seletor está presente na linha e a altura da linha não aumenta.
- Integration tests:
  - [x] Fluxo de abertura do modal, edição e salvamento continua passando após a mudança.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Atleta consegue criar um limite em horas de ponta a ponta
- Troca de unidade nunca reinterpreta um valor existente
- Altura da linha de edição inalterada
