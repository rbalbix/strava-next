---
status: completed
title: "Disparo Automático de Alertas de Manutenção"
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 03: Disparo Automático de Alertas de Manutenção

## Overview
Esta tarefa foca em garantir que a lógica de alertas de manutenção seja executada automaticamente sempre que novos dados forem recebidos pelo mecanismo de sincronização. Se um equipamento ultrapassar seu limite de uso após uma atividade ser processada, o modal de alerta deve aparecer para o usuário imediatamente.

<critical>
- SEMPRE LEIA o PRD e TechSpec antes de começar
- CONSULTE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOCO NO "O QUE" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar estruturas atuais ou áreas problemáticas
- TESTES SÃO OBRIGATÓRIOS — cada tarefa DEVE incluir testes nos entregáveis
</critical>

<requirements>
- A função `openThresholdAlert` DEVE ser invocada sempre que os dados retornados pelo `useAutoSync` no `Stats.tsx` sofrerem alteração.
- O sistema DEVE detectar novos itens em estado `overdue` (atrasado) sem necessidade de interação do usuário.
- O `ThresholdAlertModal` DEVE ser exibido automaticamente caso existam itens atrasados após a sincronização.
- Deve-se evitar o disparo repetitivo do modal para o mesmo estado se o usuário já o fechou na sessão atual.
</requirements>

## Subtasks
- [x] 3.1 Integrar a chamada de `openThresholdAlert` no fluxo de atualização do `Stats.tsx`.
- [x] 3.2 Validar se a lógica de cálculo de limites (`computeThresholdState`) está correta com os dados dinâmicos.
- [x] 3.3 Garantir que o `openModal` do `AuthContext` seja chamado com os parâmetros corretos (`threshold-alert`).

## Implementation Details
A lógica de detecção já existe na função `openThresholdAlert` dentro do `Stats.tsx`. O desafio desta tarefa é garantir sua execução reativa aos novos dados vindos do Polling, conforme mencionado no sequenciamento do TechSpec.

### Relevant Files
- `src/components/Stats.tsx` — Onde a lógica de alerta reside e deve ser acionada.
- `src/utils/thresholds.ts` — Contém a lógica de cálculo de estados de manutenção.
- `src/components/ThresholdAlertModal.tsx` — Componente visual de alerta.

### Dependent Files
- `src/contexts/AuthContext.tsx` — Fornece a função `openModal`.

### Related ADRs
- [ADR 001: Implementação de Atualização Automática da UI via Polling Inteligente](./adrs/adr-001.md) — Menciona o disparo de alertas como objetivo chave.

## Deliverables
- Lógica de alertas disparada automaticamente após sync.
- Verificação visual do modal aparecendo após atualização "silenciosa" que cruza um limite.
- Testes de integração cobrindo o fluxo de alerta automático.

## Tests
- Unit tests:
  - [x] Verificar se `openThresholdAlert` é chamado quando os dados de `gearStats` mudam.
- Integration tests:
  - [x] Simular um cenário onde um equipamento está abaixo do limite e, após um polling bem-sucedido, ele ultrapassa o limite. Verificar se o modal de alerta é exibido.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- Todos os testes passando.
- Cobertura de testes >=80%.
- Modal de manutenção aparece automaticamente quando um limite é atingido via auto-sync.
