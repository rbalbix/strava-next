# TechSpec: Melhoria da Paleta de Cores e Implementação de Glassmorphism

## Executive Summary
Esta especificação detalha a migração do sistema de estilos da GearLife para uma arquitetura baseada em **Tokens Semânticos** e a implementação da estética **Glassmorphism**. A estratégia foca na refatoração completa do `globals.css` para eliminar variáveis descritivas e na introdução de utilitários globais para efeitos de transparência com desfoque. 

O principal tradeoff técnico é o aumento da complexidade no gerenciamento de contrastes em tempo de build em troca de uma interface significativamente mais profissional, moderna e fácil de manter. Utilizaremos **Visual Regression Testing** para garantir a integridade dos fallbacks em dispositivos sem suporte a filtros de fundo.

## System Architecture

### Component Overview
- **Global Theme Engine (`src/styles/globals.css`)**: Centraliza todos os tokens semânticos e a lógica de alternância entre temas (Light/Dark).
- **Glass Utility Layer**: Classe global `.glass-effect` que encapsula as propriedades de `backdrop-filter` e seus fallbacks por gradiente.
- **Accessibility Validator (Build Script)**: Novo utilitário que valida o contraste dos tokens semânticos durante o processo de integração contínua (CI).
- **React Components**: Consomem exclusivamente os tokens semânticos via CSS Modules, eliminando dependências de cores fixas.

## Implementation Design

### Core Interfaces

**Tokens Semânticos de Exemplo (CSS Variables):**
```css
:root {
  /* Surface Tokens */
  --gl-surface-primary: #f8f9fa;
  --gl-surface-glass: rgba(255, 255, 255, 0.7);
  
  /* Brand Tokens */
  --gl-brand-primary: #fc5200; /* Strava Mate */
  --gl-brand-active: #e64a00;
  
  /* Status Tokens (Semáforo) */
  --gl-status-normal: #21ec21;
  --gl-status-warning: #ffd042;
  --gl-status-overdue: #f51313;
}
```

**Classe de Efeito Glassmorphism:**
```css
.glass-effect {
  background: var(--gl-surface-glass);
  border: 1px solid var(--gl-border-subtle);
}

@supports (backdrop-filter: blur(1px)) {
  .glass-effect {
    backdrop-filter: blur(12px);
  }
}

@supports not (backdrop-filter: blur(1px)) {
  .glass-effect {
    background: linear-gradient(135deg, var(--gl-surface-glass), var(--gl-surface-primary));
  }
}
```

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `globals.css` | Modified | Centralização de todos os novos tokens e lógica de fallback. Risco de quebra visual global. | Refatoração cuidadosa e teste manual em ambos os temas. |
| `src/styles/components/*.module.css` | Modified | Substituição de variáveis antigas pelas novas. Risco de omissão de algum componente. | Busca global (grep) por variáveis antigas e substituição sistemática. |
| CI Pipeline | New | Adição de script de validação de contraste. Risco de falha no build por cores mal definidas. | Configurar o script localmente antes de subir para o CI. |
| `Card.tsx` / `Sidebar.tsx` | Modified | Aplicação da classe `.glass-effect`. Risco de sobreposição visual ruim com conteúdos internos. | Ajustar paddings e margens se necessário. |

## Testing Approach

### Unit Tests
- **Contrast Validator Script:** Testar se o script identifica corretamente cores fora dos padrões WCAG/APCA.

### Visual Regression Tests
- **Backdrop-filter Fallback:** Capturar screenshots em ambientes com e sem suporte ao filtro para validar o gradiente de fallback.
- **Theme Toggle:** Validar se a transição entre Light e Dark mode não gera artefatos visuais ou textos ilegíveis.

## Development Sequencing

### Build Order
1. **Define Tokens:** Criar o novo conjunto de tokens semânticos no `globals.css` sob o seletor `:root` e `@media (prefers-color-scheme: dark)`.
2. **Implement Glass Utility:** Adicionar a classe `.glass-effect` com lógica de `@supports`.
3. **Global Refactor:** Substituir sistematicamente todas as referências de cores nos arquivos `.module.css` (depende do passo 1).
4. **Component Update:** Aplicar a estética de vidro nos componentes prioritários (Dashboard, Sidebar, Modais) (depende do passo 2).
5. **Accessibility Script:** Implementar o script de validação de contraste no build (depende do passo 1).

## Technical Considerations

### Key Decisions
- **Decision:** Substituição total por tokens semânticos.
- **Rationale:** Elimina a confusão entre "cor de nome" e "cor de função", facilitando temas futuros.
- **Trade-offs:** Exige refatoração de praticamente todos os arquivos de estilo do projeto.

### Known Risks
- **Performance:** O efeito de blur pode causar lag em dispositivos móveis.
  - *Mitigação:* Monitorar o frame rate em dispositivos físicos e simplificar o blur se necessário.

## Architecture Decision Records
- [ADR-001: Seleção da Abordagem Visual "Premium Glass & Performance"](adrs/adr-001.md) — Define a estética baseada em glassmorphism e foco no modo claro.
- [ADR-002: Arquitetura de Tokens Semânticos](adrs/adr-002.md) — Substituição total de nomes descritivos por funcionais.
- [ADR-003: Estratégia de Implementação de Glassmorphism e Fallbacks](adrs/adr-003.md) — Uso de classe global e fallback por gradiente linear.
- [ADR-004: Automação da Validação de Acessibilidade Cromática](adrs/adr-004.md) — Implementação de checks de contraste no build/CI.
