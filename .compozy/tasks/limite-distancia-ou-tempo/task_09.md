---
status: completed
title: Textos de descoberta da unidade
type: docs
complexity: low
dependencies:
  - task_05
  - task_07
  - task_08
---

# Task 09: Textos de descoberta da unidade

## Overview

Os textos de ajuda dizem que o limite é "em km" e descrevem o formato armazenado antigo
— ficaram incorretos com a nova capacidade. Esta task atualiza a documentação de
usuário e a de desenvolvedor para explicar que o limite pode ser em quilômetros ou em
horas de pedalagem, satisfazendo o objetivo de descoberta do PRD.

<critical>
- LEIA o PRD e a TechSpec antes de começar (seções "Core Features" (descoberta) e "Impact Analysis").
- REFERENCIE a TechSpec para detalhes de implementação — não duplique aqui.
- FOQUE NO "QUE" — descreva o que precisa ser alcançado, não como.
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou pontos de problema.
- TESTES OBRIGATÓRIOS — esta task DEVE incluir testes nos entregáveis.
</critical>

<requirements>
- A página de ajuda DEVE explicar que o limite pode ser expresso em quilômetros ou em
  horas de pedalagem, e onde a escolha é feita.
- O texto DEVE descrever que as horas são horas de pedalagem acumuladas desde a última
  manutenção do componente.
- O documento de desenvolvedor DEVE refletir o formato armazenado atualizado e as faixas
  de estado, sem remover as instruções de teste existentes.
- Os dois textos DEVEM permanecer em português do Brasil.
- As imagens referenciadas e os links existentes DEVEM ser mantidos.
- Nenhuma mudança de comportamento de código além do texto é permitida.
</requirements>

## Subtasks

- [x] 9.1 Reescrever o título e a introdução da seção de limites da página de ajuda.
- [x] 9.2 Descrever a escolha de unidade e o formato do campo na instrução de uso.
- [x] 9.3 Atualizar a descrição da barra de progresso para citar a unidade escolhida.
- [x] 9.4 Atualizar o documento de desenvolvedor: formato persistido, faixas e testes.
- [x] 9.5 Adicionar teste que impeça os dois textos de voltarem a citar só quilômetros.

## Implementation Details

Siga a seção "Core Features" do PRD (item de descoberta) e a "Impact Analysis" da
TechSpec para os dois arquivos e seus trechos. A seção da página de ajuda é longa e
tem subseções com imagens de captura de tela — altere só a parte textual.

O documento de desenvolvedor tem uma seção dedicada aos limites que descreve a chave
Redis, o formato do JSON e as faixas de estado; o formato é o que mudou com a task 03.

### Relevant Files

- `src/components/HowItWorksContent.tsx` — seção de limites da página de ajuda.
- `Readme.md` — seção de limites para desenvolvedores.

### Dependent Files

- `src/pages/como-funciona.tsx` — renderiza o conteúdo; sem alteração esperada.

### Related ADRs

- [ADR-001: Limite por equipamento com unidade selecionável pelo usuário](adrs/adr-001.md) — registra a decisão de manter a sugestão automática de unidade fora do escopo, que este texto deve refletir.

## Deliverables

- Página de ajuda explicando as duas unidades e onde a escolha é feita.
- Documento de desenvolvedor com o formato persistido e as faixas atualizados.
- Teste impedindo regressão dos textos **(OBRIGATÓRIO)**.

## Tests

- Unit tests:
  - [x] O conteúdo de ajuda renderiza menção às duas unidades de limite.
  - [x] O conteúdo de ajuda mantém a instrução de salvar o limite e as referências de imagem.
- Integration tests:
  - [x] A página de ajuda renderiza sem erro de build.
  - [x] `yarn typecheck` e `yarn test` verdes após as mudanças de texto.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Nenhum texto de ajuda afirmando que o limite é somente em quilômetros
- Documento de desenvolvedor coerente com o formato armazenado atual
