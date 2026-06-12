---
status: completed
title: Definição da Nova Arquitetura de Tokens
type: refactor
complexity: medium
dependencies: [task_01]
---

## Overview
Implementar a nova estrutura de Tokens Semânticos no arquivo global de estilos e criar a classe utilitária de Glassmorphism com seus respectivos fallbacks. Esta tarefa estabelece a fundação para a nova estética profissional do projeto.

<critical>
- Leia o PRD e a TechSpec.
- Siga estritamente as definições da seção "Core Interfaces" da TechSpec.
- Remova todas as variáveis de cores antigas após o mapeamento.
- Garanta que os nomes dos tokens sejam baseados em função/intenção.
- Verifique se os novos tokens passam na validação criada na task_01.
</critical>

<requirements>
1. O arquivo `src/styles/globals.css` DEVE conter apenas tokens semânticos (prefixo `--gl-`).
2. DEVE haver uma definição clara de tokens para `:root` (Light) e `@media (prefers-color-scheme: dark)`.
3. A classe `.glass-effect` DEVE ser implementada com suporte a `backdrop-filter` e fallback de gradiente linear.
4. O Laranja Strava DEVE ser mapeado para tokens de marca sofisticados (`--gl-brand-*`).
5. Todos os tokens de manutenção (semáforo) DEVEM ser migrados para o novo padrão.
</requirements>

## Subtasks
- [x] Mapear as cores atuais para os novos nomes semânticos.
- [x] Atualizar o `:root` com a nova paleta profissional para o Modo Claro.
- [x] Atualizar a media query de Modo Escuro com a nova paleta Premium.
- [x] Implementar a classe `.glass-effect` com a lógica de `@supports`.
- [x] Validar a nova estrutura usando o script de acessibilidade da task_01.

## Implementation Design
- Ver TechSpec seção "Core Interfaces".

### Relevant Files
- `src/styles/globals.css`: Arquivo central da refatoração.

### Dependent Files
- Todos os arquivos `.module.css` (serão atualizados na task_03).

### Related ADRs
- [ADR-002: Arquitetura de Tokens Semânticos](adrs/adr-002.md)
- [ADR-003: Estratégia de Implementação de Glassmorphism e Fallbacks](adrs/adr-003.md)

## Deliverables
- `globals.css` refatorado com tokens semânticos.
- Classe `.glass-effect` disponível globalmente.
- Relatório de validação de acessibilidade passando.

## Tests
### Unit Tests
- [x] Verificar se todas as variáveis antigas foram removidas (grep).
- [x] Verificar se as novas variáveis seguem o padrão de nomenclatura `--gl-*`.

### Integration Tests
- [x] Rodar `npm run lint:colors` (ou equivalente) e confirmar aprovação de 100% dos tokens críticos.

## Success Criteria
- `globals.css` limpo de variáveis legadas.
- Validação de contraste automática aprovada.
- Estilos de fallback de vidro funcionando via CSS.
