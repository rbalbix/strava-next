---
status: completed
title: Barra de progresso na unidade do limite
type: frontend
complexity: medium
dependencies:
  - task_02
  - task_03
---

# Task 06: Barra de progresso na unidade do limite

## Overview

A barra de progresso do detalhe do equipamento calcula largura e faixa sobre
distância, e é totalmente silenciosa para leitor de tela. Esta task faz a barra medir
na unidade do limite, anunciar qual unidade ela mede, e deixar de depender exclusivamente
de distância para aparecer — pré-requisito para o editor ganhar o seletor de unidade.

<critical>
- LEIA o PRD e a TechSpec antes de começar (seções "Core Interfaces" e "Known Risks").
- REFERENCIE a TechSpec para detalhes de implementação — não duplique aqui.
- FOQUE NO "QUE" — descreva o que precisa ser alcançado, não como.
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou pontos de problema.
- TESTES OBRIGATÓRIOS — esta task DEVE incluir testes nos entregáveis.
</critical>

<requirements>
- O componente DEVE receber o limite no formato par valor+unidade.
- Largura e faixa DEVE ser calculadas com a função de conversão da task 02, sobre a
  razão entre valor consumido e limite, limitada a 100%.
- O item DEVE continuar renderizando quando houver distância acumulada, e DEVE passar a
  renderizar também quando houver tempo de pedalagem acumulado mesmo sem distância.
- As mensagens especiais de lubrificação e limpeza DEVEM manter precedência sobre a
  nova condição de renderização.
- A barra DEVE exibir o valor e a unidade dentro da trilha, com uma casa decimal para
  horas, sem acrescentar mais que uma linha de altura.
- O contêiner da barra NÃO pode continuar anulando o conteúdo para leitor de tela: a
  barra DEVE expor papel de progresso com o valor formatado na unidade certa.
- Os badges de distância e tempo existentes DEVEM permanecer inalterados.
</requirements>

## Subtasks

- [x] 6.1 Trocar a prop do componente para o limite no formato par valor+unidade e ajustar a chamada.
- [x] 6.2 Calcular largura e faixa pela função de conversão da task 02.
- [x] 6.3 Ampliar a condição de renderização para aceitar tempo de pedalagem sem distância.
- [x] 6.4 Exibir valor e unidade dentro da trilha, no formato definido para a unidade.
- [x] 6.5 Tornar a barra acessível: papel de progresso e valor anunciado na unidade certa.
- [x] 6.6 Cobrir largura, rótulo e acessibilidade nas duas unidades.

## Implementation Details

Siga a seção "Core Interfaces" da TechSpec para a composição das duas funções puras, e
"Known Risks" para os dois riscos desta task: o atributo que anula o conteúdo da barra e
a condição de renderização dependente só de distância.

A chamada do componente vive em `CardDetailModal.tsx` e passa o limite lido do contrato
(desde a task 03). Atualize a chamada junto com a prop para manter o repositório
compilando ao fim desta task; o editor em si é a task seguinte.

Atenção ao bloco legado de estilos de editor dentro de `CardItem.module.css`: ele não é
usado pelo JSX atual — altere apenas as classes que o JSX referencia.

### Relevant Files

- `src/components/CardItem.tsx` — prop, cálculo, condição de renderização, rótulo e acessibilidade.
- `src/components/CardDetailModal.tsx` — única chamada do componente (só a prop).
- `tests/unit/components/card-item.progress.test.tsx` — cobertura da largura.

### Dependent Files

- `src/utils/thresholds.ts` — função de conversão consumida aqui (task 02).
- `src/contracts/api.ts` — par valor+unidade (task 03).
- `src/styles/components/CardItem.module.css` — altura da trilha e do rótulo (task 08).
- `src/utils/clipboard.ts` — copia os detalhes do equipamento; não deve mudar.

### Related ADRs

- [ADR-003: Resolução do valor atual por helper puro compartilhado](adrs/adr-003.md) — fonte única do valor consumido usado aqui.
- [ADR-001: Limite por equipamento com unidade selecionável pelo usuário](adrs/adr-001.md) — a barra passa a anunciar a unidade medida.

## Deliverables

- Barra medindo na unidade do limite, com valor e unidade visíveis na trilha.
- Condição de renderização aceitando tempo de pedalagem sem distância.
- Barra com papel de progresso acessível e valor anunciado na unidade certa.
- Testes de largura, rótulo e acessibilidade nas duas unidades **(OBRIGATÓRIO)**.

## Tests

- Unit tests:
  - [x] Largura de 50% para limite em quilômetros com metade consumida (caso existente, adaptado ao formato novo).
  - [x] Largura correta quando o limite está em horas e o tempo consumido é fração do limite.
  - [x] Largura limitada a 100% quando o limite é ultrapassado.
  - [x] Faixa de aviso aplicada ao atingir 80% do limite em horas.
  - [x] Item renderiza com tempo de pedalagem presente e distância zerada.
  - [x] Mensagens de lubrificação e limpeza continuam com precedência.
  - [x] Rótulo dentro da trilha exibe o valor formatado com a unidade de horas.
  - [x] Barra expõe papel de progresso com o valor anunciado na unidade certa.
  - [x] Badges de distância e tempo continuam no formato atual.
- Integration tests:
  - [x] `tests/unit/components/card-detail-modal.save.test.tsx` continua verde após a troca de prop.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Barra medida em horas quando o limite estiver em horas, e em quilômetros caso contrário
- Nenhuma dependência de distância para exibir um limite em horas
- Leitor de tela anuncia a unidade medida pela barra
