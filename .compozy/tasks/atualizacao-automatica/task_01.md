---
status: completed
title: "Infra e Hook: Instalar `swr` e criar `src/hooks/useAutoSync.ts`"
type: frontend
complexity: medium
dependencies: []
---

# Task 01: Infra e Hook: Instalar `swr` e criar `src/hooks/useAutoSync.ts`

## Overview
Este task foca na configuração inicial da infraestrutura de polling para a atualização automática. O objetivo é instalar a biblioteca `swr` e criar um hook customizado `useAutoSync` que encapsule a lógica de busca periódica de dados do dashboard.

<critical>
- SEMPRE LEIA o PRD e TechSpec antes de começar
- CONSULTE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOCO NO "O QUE" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar estruturas atuais ou áreas problemáticas
- TESTES SÃO OBRIGATÓRIOS — cada tarefa DEVE incluir testes nos entregáveis
</critical>

<requirements>
- A biblioteca `swr` DEVE ser instalada como uma dependência de produção.
- O hook `useAutoSync` DEVE ser criado em `src/hooks/useAutoSync.ts`.
- O hook DEVE aceitar um parâmetro opcional `intervalMs` com valor padrão de 5000ms (5 segundos).
- O hook DEVE utilizar o `apiClient.getDashboard` como fetcher para o SWR.
- O hook DEVE configurar o SWR para revalidar ao focar (`revalidateOnFocus: true`) e ao reconectar (`revalidateOnReconnect: true`).
- O hook DEVE retornar os dados do dashboard, estados de carregamento e erro, além da função `mutate`.
</requirements>

## Subtasks
- [x] 1.1 Instalar a dependência `swr` no projeto.
- [x] 1.2 Criar o arquivo `src/hooks/useAutoSync.ts`.
- [x] 1.3 Implementar a interface do hook conforme definido no TechSpec.
- [x] 1.4 Exportar o hook `useAutoSync` para uso em componentes frontend.

## Implementation Details
A implementação deve seguir o padrão sugerido na seção 'Hook useAutoSync' do TechSpec. O uso do SWR garante que o cache seja gerenciado de forma eficiente e que a UI possa reagir a mudanças de dados de forma transparente.

### Relevant Files
- `src/lib/apiClient.ts` — Contém a função `getDashboard` que será usada pelo hook.
- `package.json` — Arquivo onde a nova dependência `swr` será registrada.

### Dependent Files
- `src/components/Stats.tsx` — Será o principal consumidor deste hook na Task 02.

### Related ADRs
- [ADR 001: Implementação de Atualização Automática da UI via Polling Inteligente](./adrs/adr-001.md) — Define a escolha do Polling de 5s usando SWR.

## Deliverables
- Dependência `swr` adicionada ao `package.json`.
- Novo arquivo `src/hooks/useAutoSync.ts` implementado.
- Testes unitários para o hook `useAutoSync` com 80%+ de cobertura.

## Tests
- Unit tests:
  - [ ] Verificar se o hook chama `apiClient.getDashboard` no intervalo configurado.
  - [ ] Verificar se o hook retorna `isLoading` corretamente durante a busca inicial.
  - [ ] Verificar se o hook retorna erro quando a API falha.
  - [ ] Verificar se o hook pausa o polling conforme as configurações padrão do SWR (ex: aba oculta).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- Todos os testes passando.
- Cobertura de testes >=80%.
- Hook funcional e exportado corretamente.
- Biblioteca `swr` disponível no projeto.
