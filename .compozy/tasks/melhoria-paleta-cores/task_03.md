---
status: completed
title: Refatoração Global de Estilos de Componentes
type: refactor
complexity: high
dependencies: [task_02]
---

## Overview
Substituir todas as referências às variáveis de cores antigas nos arquivos CSS Modules de cada componente pelas novas variáveis de Tokens Semânticos. Esta é uma tarefa de larga escala que garante a consistência visual em toda a aplicação.

<critical>
- Não altere a lógica dos componentes, apenas as referências de variáveis no CSS.
- Substitua variáveis descritivas (ex: `--light-blue`) por funcionais (ex: `--gl-brand-primary`).
- Mantenha o comportamento visual o mais próximo possível do original, exceto onde a TechSpec dita melhorias.
- Verifique se nenhum componente ficou com estilos "quebrados" por variáveis inexistentes.
</critical>

<requirements>
1. TODOS os arquivos `.module.css` em `src/styles/components/` e `src/styles/pages/` DEVEM ser revisados.
2. NENHUM arquivo CSS DEVE utilizar as variáveis antigas após a conclusão.
3. As cores de manutenção nos componentes de visualização DEVEM usar os novos tokens `--gl-status-*`.
4. Os ícones e estados de hover DEVEM ser atualizados para os tokens semânticos correspondentes.
</requirements>

## Subtasks
- [x] Identificar todos os arquivos CSS que consomem variáveis de cores.
- [x] Refatorar os estilos dos componentes de Layout (Sidebar, Header, Footer).
- [x] Refatorar os estilos dos componentes de Dados (Card, CardItem, Stats).
- [x] Refatorar os estilos das Páginas (Home, PublicPage).
- [x] Garantir que os modais utilizem os novos tokens de superfície.

## Implementation Design
- Ver TechSpec seção "Impact Analysis".

### Relevant Files
- `src/styles/components/*.module.css`
- `src/styles/pages/*.module.css`

### Dependent Files
- Todos os arquivos CSS Modules do projeto.

### Related ADRs
- [ADR-002: Arquitetura de Tokens Semânticos](adrs/adr-002.md)

## Deliverables
- Todos os arquivos CSS Modules atualizados para a nova arquitetura de tokens.
- Aplicação funcional sem erros de variáveis CSS indefinidas.

## Tests
### Unit Tests
- [x] Teste de regressão visual (manual ou automatizado) em cada componente refatorado.
- [x] Verificar via inspector do browser se os tokens estão sendo aplicados corretamente.

### Integration Tests
- [x] Verificação de "build pass" do CSS (sem erros de parsing).

## Success Criteria
- Zero ocorrências de variáveis de cores antigas no projeto (validado via grep).
- Interface visualmente íntegra em ambos os temas.
