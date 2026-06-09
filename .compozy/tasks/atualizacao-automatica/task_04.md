---
status: completed
title: "Testes Unitários e de Integração (Auto-Sync)"
type: test
complexity: medium
dependencies:
  - task_01
  - task_02
  - task_03
---

# Task 04: Testes Unitários e de Integração (Auto-Sync)

## Overview
Esta tarefa é dedicada à consolidação da cobertura de testes para a funcionalidade de atualização automática. Embora cada tarefa anterior inclua seus próprios testes, esta tarefa garante que o fluxo completo (Integração/E2E) esteja robusto, cobrindo interações complexas entre SWR, AuthContext e a UI do Dashboard.

<critical>
- SEMPRE LEIA o PRD e TechSpec antes de começar
- REFERENCE O TECHSPEC para padrões de teste — não duplique lógica aqui
- FOCO NO "O QUE" — descreva os cenários de teste a serem validados
- MINIMIZE CÓDIGO — descreva os testes em vez de escrever todo o código aqui
- TESTES SÃO OBRIGATÓRIOS — o objetivo principal desta tarefa é a validação final
</critical>

<requirements>
- DEVE ser criada uma suíte de teste de integração específica para o fluxo de Auto-Sync.
- OS testes DEVEM utilizar `msw` (Mock Service Worker) para simular diferentes respostas da API de dashboard ao longo do tempo.
- DEVE ser validado o comportamento de "silenciar" o polling quando a aba do navegador perde visibilidade.
- DEVE ser garantido que a cobertura de código das partes alteradas (`useAutoSync`, `Stats`, lógica de sync) seja superior a 80%.
</requirements>

## Subtasks
- [x] 4.1 Criar arquivo de teste `tests/integration/auto-sync.test.ts`.
- [x] 4.2 Configurar handlers do `msw` para retornar dados incrementais a cada chamada sucessiva de `/api/app/dashboard`.
- [x] 4.3 Implementar teste de visibilidade: simular mudança de visibilidade da página e verificar se o SWR interrompe as requisições.
- [x] 4.4 Implementar teste de erro: simular falha na API durante o polling e verificar se a interface lida graciosamente com o erro.
- [x] 4.5 Verificar a cobertura final de testes para os arquivos modificados na feature.

## Implementation Details
Utilize as ferramentas de teste já configuradas no projeto (`vitest`, `@testing-library/react`, `msw`). Siga os padrões existentes em `tests/integration/`.

### Relevant Files
- `tests/integration/auto-sync.test.ts` — Nova suíte de testes.
- `src/hooks/useAutoSync.ts` — Alvo dos testes.
- `src/components/Stats.tsx` — Alvo dos testes de integração.

### Dependent Files
- `package.json` — Para conferir os scripts de teste e cobertura.

### Related ADRs
- [ADR 001: Implementação de Atualização Automática da UI via Polling Inteligente](./adrs/adr-001.md) — Justifica os cenários de teste de visibilidade e economia de recursos.

## Deliverables
- Suíte de testes de integração completa e passando.
- Relatório de cobertura de testes demonstrando >80% nos arquivos da feature.

## Tests
- Unit tests:
  - [x] Verificações adicionais de casos de borda no hook.
- Integration tests:
  - [x] Fluxo completo: Dados A -> Polling -> Dados B -> UI Atualizada -> Modal de Alerta Aberto.
  - [x] Comportamento em background: Page Hidden -> No Polling -> Page Visible -> Polling Resumed.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- Todos os testes passando.
- Cobertura de testes >=80% global para a feature.
- Zero regressões em fluxos de dashboard existentes.
