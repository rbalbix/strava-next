---
status: completed
title: "Integração no Stats.tsx e estados globais"
type: frontend
complexity: medium
dependencies:
  - task_01
---

# Task 02: Integração no Stats.tsx e estados globais

## Overview
Esta tarefa consiste em integrar o hook `useAutoSync` no componente `Stats.tsx`, substituindo a lógica manual de busca no `useEffect`. O objetivo é garantir que a interface seja atualizada automaticamente e que o estado global (`AuthContext`) e o cache local (`sessionStorage`) permaneçam sincronizados com os dados mais recentes.

<critical>
- SEMPRE LEIA o PRD e TechSpec antes de começar
- CONSULTE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOCO NO "O QUE" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar estruturas atuais ou áreas problemáticas
- TESTES SÃO OBRIGATÓRIOS — cada tarefa DEVE incluir testes nos entregáveis
</critical>

<requirements>
- O componente `Stats.tsx` DEVE utilizar o hook `useAutoSync` para obter os dados do dashboard.
- A lógica de busca manual dentro do `useEffect` no `Stats.tsx` DEVE ser removida ou refatorada.
- Sempre que novos dados forem recebidos pelo SWR, as funções `setAthleteInfo` e `setAthleteInfoStats` do `AuthContext` DEVEM ser chamadas para atualizar o estado global.
- O `sessionStorage` DEVE ser atualizado com os novos dados para manter a persistência entre refreshes manuais, seguindo a lógica de cache existente.
- A UI DEVE reagir silenciosamente: as atualizações de quilometragem e tempo devem ocorrer sem spinners intrusivos após o carregamento inicial.
</requirements>

## Subtasks
- [x] 2.1 Refatorar `src/components/Stats.tsx` para importar e utilizar `useAutoSync`.
- [x] 2.2 Sincronizar o resultado do `useAutoSync` com o `AuthContext` via `useEffect` ou callback.
- [x] 2.3 Atualizar o mecanismo de persistência no `sessionStorage` com os dados recebidos pelo polling.
- [x] 2.4 Ajustar o tratamento de erros para usar o estado de erro retornado pelo hook.

## Implementation Details
Consulte a seção 'Refatoração do Stats.tsx' no TechSpec. A transição deve garantir que o `sessionStorage` não seja corrompido e que os componentes filhos do `Stats.tsx` recebam as props atualizadas instantaneamente.

### Relevant Files
- `src/components/Stats.tsx` — Arquivo principal a ser modificado.
- `src/contexts/AuthContext.tsx` — Utilizado para atualizar o estado global do atleta.
- `src/hooks/useAutoSync.ts` — Hook criado na Task 01.

### Dependent Files
- `src/components/Card.tsx` — Recebe dados atualizados do `Stats.tsx`.
- `src/components/AthleteStats.tsx` — Consome dados do `AuthContext` que serão sincronizados.

### Related ADRs
- [ADR 001: Implementação de Atualização Automática da UI via Polling Inteligente](./adrs/adr-001.md) — Contexto sobre a necessidade de atualização silenciosa.

## Deliverables
- Componente `Stats.tsx` refatorado e funcional com SWR.
- Sincronização automática entre polling, `AuthContext` e `sessionStorage` verificada.
- Testes de integração simulando atualizações de dados.

## Tests
- Unit tests:
  - [x] Verificar se `setAthleteInfo` é chamado quando o hook retorna novos dados do atleta.
  - [x] Verificar se o `sessionStorage` reflete as mudanças após uma revalidação do SWR.
- Integration tests:
  - [x] Simular uma mudança nos dados da API e verificar se o componente `Stats` renderiza os novos valores sem refresh.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- Todos os testes passando.
- Cobertura de testes >=80%.
- Dados do dashboard atualizando automaticamente a cada 5 segundos (com aba ativa).
- Estado global e cache local em sincronia.
