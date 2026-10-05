---
status: completed
title: Qualificação e regressão da feature
type: chore
complexity: medium
dependencies:
  - task_01
  - task_02
  - task_03
  - task_04
  - task_05
  - task_06
  - task_07
  - task_08
  - task_09
---

# Task 10: Qualificação e regressão da feature

## Overview

As tasks anteriores alteram contrato, serviço, endpoint, três componentes, estilos e
textos. Esta task é a qualificação final: roda a cadeia de validação completa do
projeto, confirma a cobertura exigida e percorre manualmente os dois fluxos — limite em
quilômetros e limite em horas — para garantir que nada regrediu.

<critical>
- LEIA o PRD e a TechSpec antes de começar (seções "Testing Approach" e "Development Sequencing").
- REFERENCIE a TechSpec para detalhes de implementação — não duplique aqui.
- FOQUE NO "QUE" — descreva o que precisa ser alcançado, não como.
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou pontos de problema.
- TESTES OBRIGATÓRIOS — esta task DEVE incluir testes nos entregáveis.
</critical>

<requirements>
- A cadeia de validação completa do projeto DEVE sair com código 0: lint, contraste de
  cor, checagem de tipos, testes e build.
- A cobertura DEVE manter os limites já configurados do projeto.
- Os nove arquivos de teste que citam limites DEVEM continuar passando.
- O fluxo de limite em quilômetros DEVE permanecer idêntico ao comportamento anterior.
- O fluxo de limite em horas DEVE funcionar de ponta a ponta: criação, recarregamento,
  barra de progresso e alerta.
- Regressão de cliente antigo DEVE ser verificada: requisição sem a unidade persiste
  como quilômetros.
- Qualquer falha encontrada DEVE ser corrigida nesta task, não adiada.
</requirements>

## Subtasks

- [x] 10.1 Rodar a cadeia de validação completa e registrar o resultado.
- [x] 10.2 Confirmar a cobertura de testes dentro dos limites do projeto.
- [x] 10.3 Percorrer manualmente o fluxo de limite em quilômetros.
- [x] 10.4 Percorrer manualmente o fluxo de limite em horas.
- [x] 10.5 Verificar a retrocompatibilidade de requisição sem a unidade.
- [x] 10.6 Corrigir qualquer falha ou regressão encontrada.
- [x] 10.7 Revisar acessibilidade do seletor e da barra por teclado e leitor de tela.

## Implementation Details

Siga a seção "Testing Approach" da TechSpec para a lista de suítes e o gate de
qualificação. A ordem de execução da cadeia está em "Development Sequencing"
(passo final) e corresponde ao script `validate` do projeto.

Os arquivos de regressão que citam limites: utilitário de cálculo, serviço, integração
do endpoint, integração do dashboard, configuração de chaves, cliente de API, e os três
testes de componente (lista de equipamentos, editor e modal de alerta).

### Relevant Files

- `package.json` — cadeia de validação e scripts de teste.
- `vitest.config.mjs` — limites de cobertura exigidos.
- `scripts/validate-color-contrast.mjs` — gate de contraste das cores novas.

### Dependent Files

- Todos os arquivos alterados pelas tasks 01 a 09.

### Related ADRs

- [ADR-002: Modelo persistido `{ value, unit }` com normalização retrocompatível na leitura](adrs/adr-002.md) — a retrocompatibilidade verificada aqui é a prometida por este ADR.

## Deliverables

- Cadeia de validação completa executada com sucesso.
- Cobertura dentro dos limites do projeto.
- Registro dos dois fluxos manualmente percorridos e da verificação de retrocompatibilidade.
- Correções de qualquer falha encontrada **(OBRIGATÓRIO)**.

## Tests

- Unit tests:
  - [x] Suíte de utilitários de limite passando, incluindo a conversão por unidade.
  - [x] Suíte do serviço passando, incluindo normalização de registro legado.
  - [x] Suíte do cliente de API passando, incluindo payload com unidade.
  - [x] Suítes de componente passando, incluindo gatilho do alerta e editor com seletor.
- Integration tests:
  - [x] Integração do endpoint passando nos quatro casos (sem unidade, com horas, unidade inválida, sem sessão).
  - [x] Integração do dashboard passando, incluindo o caso de falha tolerada.
  - [x] Suíte de regressão do projeto inteira passando.
  - [x] `yarn validate` inteiro saindo com código 0.
  - [x] Cobertura de testes dentro dos limites configurados.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Cadeia de validação completa com código 0
- Fluxo em quilômetros indistinguível do comportamento anterior
- Fluxo em horas funcionando de criação a alerta, sobrevivendo a recarregamento
- Requisição sem a unidade persistindo como quilômetros

## Registro de execução (2026-10-03)

- **Cadeia de validação (10.1):** `yarn validate` → 0 — lint, `lint:colors` com
  12 pares aprovados, typecheck, **57 arquivos / 343 testes** e build
  `Compiled successfully`.
- **Cobertura (10.2):** `yarn test:coverage` → 0 — 99,7% stmts, 94,37% branches,
  100% functions, 99,7% lines contra os limites 99/94/97/99, com
  `vitest.config.mjs` **intocado**. Débito fechado nesta task: no HEAD `fc15198`
  a cobertura era 91,68% e o gate já falhava por arquivos alheios à feature
  (ícones, `InitialInfo`, `Sidebar`, `registerServiceWorker`, `AuthContext`) —
  decisão do usuário registrada durante a execução ("Fechar a dívida agora").
- **Fluxos (10.3/10.4):** percorridos por
  `tests/regression/threshold-unit-flows.test.tsx`, que encadeia criação pelo
  editor → persistência → recarregamento → barra de progresso → alerta, em
  quilômetros e em horas, atravessando serviço real de limites com Redis em
  memória. **Limitação declarada:** o passeio manual humano num navegador não é
  executável neste ambiente (sem `docker`/`redis-cli`, login por OAuth interativo
  do Strava, aba do navegador desktop desconectada e Playwright/Chromium
  indisponível no Ubuntu 26.04); o substituto acima é a evidência mais forte
  disponível.
- **Retrocompatibilidade (10.5):** requisição sem `unit` persiste como
  `{ value, unit: 'km' }` em
  `tests/integration/equipment-thresholds.test.ts`; registro legado numérico é
  relido como quilômetros em `tests/unit/services/thresholds.test.ts` e no
  teste de regressão.
- **Acessibilidade (10.7):** `radiogroup` nomeado ("Unidade do limite"), roving
  tabindex e setas movendo seleção **e** foco, Enter salvando pelo teclado e
  tecla comum ignorada (`card-detail-modal.save.test.tsx`); `role="progressbar"`
  com `aria-valuetext` na unidade (`card-item.progress.test.tsx` e regressão).
  Nome acessível do input numérico é lacuna **pré-existente** (o input já existia
  no HEAD) → follow-up.
