---
status: completed
title: Configuração do Validador de Acessibilidade
type: infra
complexity: medium
dependencies: []
---

## Overview
Criar um script de automação para validar o contraste das cores definidas nos tokens semânticos do projeto. O script deve garantir que as combinações de cores de fundo e texto atendam aos padrões de acessibilidade (APCA/WCAG) em ambos os temas.

<critical>
- Leia o PRD e a TechSpec antes de iniciar.
- Referencie a seção "Accessibility Validator" da TechSpec.
- Foco exclusivo no script de validação; não altere estilos ainda.
- O script deve ser integrável ao pipeline de CI.
- Testes unitários para o script são obrigatórios.
</critical>

<requirements>
1. O script DEVE analisar o arquivo `src/styles/globals.css`.
2. O script DEVE calcular o contraste entre pares de tokens pré-definidos (ex: `--gl-text-primary` sobre `--gl-surface-primary`).
3. O script DEVE utilizar o algoritmo APCA conforme estabelecido no PRD.
4. O build DEVE falhar se qualquer par de tokens obrigatório não atingir o nível de contraste mínimo.
5. O script DEVE suportar a validação tanto para o tema Light quanto para o Dark.
</requirements>

## Subtasks
- [x] Definir a lista de pares de tokens críticos para validação.
- [x] Implementar o motor de cálculo de contraste usando uma biblioteca compatível com APCA.
- [x] Criar o parser para extrair valores de variáveis CSS do `globals.css`.
- [x] Integrar o script no ciclo de vida do npm (ex: `npm run lint:colors`).
- [x] Configurar a falha do build no CI caso a validação falhe.

## Implementation Design
- Ver TechSpec seção "Accessibility Validator".
- O script pode ser escrito em Node.js para facilitar a integração.

### Relevant Files
- `src/styles/globals.css`: Fonte principal dos valores dos tokens.
- `package.json`: Para adicionar o novo script de lint.
- `.github/workflows/ci-tests.yml`: Para integração no CI.

### Dependent Files
- `src/styles/globals.css`: Depende da estrutura de tokens que será definida na task_02.

### Related ADRs
- [ADR-004: Automação da Validação de Acessibilidade Cromática](adrs/adr-004.md)

## Deliverables
- Script de validação funcional.
- Cobertura de testes unitários para o script >= 80%.
- Integração no `package.json`.

## Tests
### Unit Tests
- [x] Validar se o parser extrai cores HEX e RGB corretamente.
- [x] Validar se o cálculo APCA retorna valores precisos para cores conhecidas.
- [x] Validar se o script identifica corretamente uma falha de contraste.

### Integration Tests
- [x] Executar o script contra um `globals.css` de teste e verificar se o processo termina com código de erro correto.

## Success Criteria
- Script executa via `npm run lint:colors`.
- Build falha no CI se houver erro de contraste.
- Test coverage >= 80%.
