---
status: completed
title: Estilos do seletor e da barra de progresso
type: frontend
complexity: low
dependencies:
  - task_06
  - task_07
---

# Task 08: Estilos do seletor e da barra de progresso

## Overview

O modal de detalhe é a superfície mais apertada do aplicativo: o campo de limite tem
largura fixa e a barra de progresso tem 8px, baixo demais para comportar texto. Esta
task ajusta os dois estilos para acomodar o seletor na mesma linha e o rótulo dentro
da trilha, sem ganho de altura e passando pelo gate de contraste do projeto.

<critical>
- LEIA o PRD e a TechSpec antes de começar (seções "User Experience" e "Known Risks").
- REFERENCIE a TechSpec para detalhes de implementação — não duplique aqui.
- FOQUE NO "QUE" — descreva o que precisa ser alcançado, não como.
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou pontos de problema.
- TESTES OBRIGATÓRIOS — esta task DEVE incluir testes nos entregáveis.
</critical>

<requirements>
- A linha de edição DEVE deixar o campo flexível para acomodar campo, seletor e botão
  de salvar lado a lado, mantendo a altura atual da linha.
- Os breakpoints existentes DEVEM continuar valendo: campo mais estreito abaixo de
  768px e quebra de linha abaixo de 398px.
- A trilha da barra DEVE ficar alta o suficiente para o rótulo de valor e unidade,
  acrescentando no máximo uma linha à altura atual.
- O rótulo DEVE permanecer legível tanto sobre a parte preenchida quanto sobre a vazia.
- Todas as combinações de cor novas DEVEM ser aprovadas por `yarn lint:colors`.
- O bloco legado de estilos de editor dentro do arquivo de estilos da lista de
  equipamentos NÃO deve ser alterado — ele não é usado pelo JSX atual.
</requirements>

## Subtasks

- [x] 8.1 Tornar o campo de valor flexível e estilizar o seletor na mesma linha.
- [x] 8.2 Estilizar os dois segmentos com estado ativo, inativo e foco visível.
- [x] 8.3 Aumentar a trilha da barra e posicionar o rótulo de valor e unidade dentro dela.
- [x] 8.4 Garantir legibilidade do rótulo sobre as partes preenchida e vazia.
- [x] 8.5 Preservar os breakpoints de tela estreita.
- [x] 8.6 Validar as cores novas pelo gate de contraste do projeto.

## Implementation Details

Siga a seção "User Experience" da TechSpec para as restrições de espaço e acessibilidade.
Os valores atuais estão em `src/styles/components/CardDetailModal.module.css` (linha de
edição) e `src/styles/components/CardItem.module.css` (trilha da barra e badge).

O gate de contraste é o script `yarn lint:colors`, que lê os tokens `--gl-*` do
arquivo global de estilos e roda no CI. Use tokens existentes — não crie cores novas.

Ao alterar a trilha da barra, confira se os testes de componente que localizam a barra
por seletor continuam encontrando-a.

### Relevant Files

- `src/styles/components/CardDetailModal.module.css` — linha de edição e seletor.
- `src/styles/components/CardItem.module.css` — trilha da barra e rótulo.

### Dependent Files

- `src/components/CardDetailModal.tsx` — classe do seletor renderizada aqui (task 07).
- `src/components/CardItem.tsx` — rótulo dentro da trilha (task 06).
- `tests/unit/components/card-item.progress.test.tsx` — localiza a barra por seletor.

### Related ADRs

- [ADR-001: Limite por equipamento com unidade selecionável pelo usuário](adrs/adr-001.md) — registra o custo de altura da trilha e a restrição de espaço do modal.

## Deliverables

- Linha de edição com campo, seletor e botão lado a lado, sem ganho de altura.
- Trilha da barra com rótulo de valor e unidade legível.
- `yarn lint:colors` aprovando as combinações novas **(OBRIGATÓRIO)**.
- Testes de componente continuando localizando a barra e o seletor **(OBRIGATÓRIO)**.

## Tests

- Unit tests:
  - [x] Testes existentes da barra continuam encontrando a trilha e o preenchimento.
  - [x] Testes do editor continuam encontrando campo, seletor e botão na linha.
- Integration tests:
  - [x] `yarn lint:colors` sai com código 0 após as mudanças de cor.
  - [x] `yarn typecheck` e `yarn test` continuam verdes após as mudanças de estilo.
  - [x] Verificação visual abaixo de 768px e de 398px sem quebra de linha indevida.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Altura da linha de edição inalterada e altura da barra acrescentando no máximo uma linha
- `yarn lint:colors` aprovado
- Nenhuma alteração no bloco legado de estilos não utilizado
