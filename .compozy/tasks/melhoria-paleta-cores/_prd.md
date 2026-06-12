# PRD: Modernização da Paleta de Cores (Premium Glass & Performance)

## Overview
Este documento detalha a revisão e melhoria da paleta de cores da GearLife, focando em elevar o profissionalismo da interface tanto no modo claro quanto no modo escuro. O objetivo é implementar uma estética moderna baseada em "Glassmorphism" que melhore a percepção de qualidade do produto, mantendo a funcionalidade crítica de sinalização de manutenção.

- **Problema:** O modo claro atual carece de um aspecto profissional e o modo escuro, embora preferido, pode ser otimizado para maior conforto visual e profundidade.
- **Público:** Atletas que utilizam a GearLife para gerenciar a manutenção de seus equipamentos e buscam uma interface de alta performance.
- **Valor:** Uma interface mais moderna e profissional aumenta a confiança do usuário no sistema e reduz a fadiga visual durante o uso prolongado.

## Goals
- **Profissionalização do Modo Claro:** Transformar o modo claro de uma "inversão simples" para uma experiência de design rica e sofisticada.
- **Implementação de Glassmorphism:** Criar profundidade e hierarquia visual através de superfícies translúcidas com desfoque.
- **Acessibilidade Perceptiva:** Melhorar o contraste e a legibilidade seguindo princípios modernos de design para modos claro/escuro.
- **Manutenção da Funcionalidade:** Garantir que as cores de alerta (Verde, Amarelo, Vermelho) permaneçam vibrantes e imediatamente reconhecíveis.

## User Stories
- **Como usuário frequente,** quero uma interface que seja confortável aos olhos tanto de dia quanto de noite, para que eu possa verificar meus equipamentos sem esforço visual.
- **Como atleta atento aos detalhes,** quero que a interface transmita um tom de "alta performance" e profissionalismo, para sentir que estou usando uma ferramenta de elite.
- **Como usuário do modo claro,** quero que a interface não pareça genérica ou "branca demais", mas sim elegante e moderna.

## Core Features

### 1. Sistema de Tokens Semânticos
- Implementar uma arquitetura de cores baseada em intenção (ex: `--surface-glass`, `--accent-primary`) em vez de valores fixos.
- Facilita a manutenção e garante consistência entre os modos claro e escuro.

### 2. Superfícies de Vidro (Glassmorphism)
- Uso de `backdrop-filter: blur` em cards e modais.
- No modo escuro: Superfícies em cinzas profundos com transparência sutil.
- No modo claro: Superfícies em off-white translúcido, criando uma sensação de leveza e sofisticação.

### 3. Paleta Funcional de Manutenção
- Manter o sistema de "Semáforo" (Normal, Alerta, Atrasado) com cores vibrantes.
- As cores devem ser testadas para garantir contraste adequado contra as novas superfícies de vidro em ambos os modos.

### 4. Refinamento do Laranja Strava
- Adaptação do laranja da marca para uma versão "Mate/Sophisticated" que não "vibre" excessivamente no modo escuro e pareça premium no modo claro.

## User Experience
- **Modo Escuro:** Será a experiência de "assinatura" da aplicação, focada em profundidade e tons escuros sofisticados.
- **Modo Claro:** Focado em minimalismo e sofisticação, utilizando brancos "sujos" e cinzas claríssimos para evitar o brilho excessivo.
- **Acessibilidade:** Garantir que todo o texto crítico passe nos testes de contraste, utilizando o algoritmo APCA como referência para conforto visual.

## High-Level Technical Constraints
- **Performance de Renderização:** Os efeitos de `backdrop-filter` devem ser otimizados para não causar lentidão em navegadores móveis (Android/iOS via Capacitor).
- **Consistência Cross-Platform:** As cores devem ser validadas em diferentes tipos de telas (OLED vs LCD).

## Non-Goals (Out of Scope)
- Redesenho da estrutura de layout ou UX dos componentes.
- Mudança de logotipos ou branding principal (além do ajuste de tom do laranja).
- Implementação de temas personalizados além do Claro/Escuro.

## Phased Rollout Plan

### MVP (Phase 1)
- Atualização das variáveis globais no `globals.css`.
- Implementação do efeito de vidro nos cards principais da Dashboard.
- Ajuste das cores funcionais de manutenção.

### Phase 2
- Extensão do design para todos os modais e sidebar.
- Refinamento de estados de hover e interatividade.
- Testes de acessibilidade e ajustes finos de contraste.

## Success Metrics
- **Aprovação Estética:** Feedback positivo do usuário em relação ao novo visual.
- **Conformidade de Acessibilidade:** 100% dos textos críticos com contraste aprovado.
- **Performance:** Tempo de renderização estável mesmo com efeitos de blur ativos.

## Risks and Mitigations
- **Risco de Performance:** Efeitos de desfoque podem pesar em dispositivos antigos.
  - *Mitigação:** Fornecer fallback para cores sólidas caso o navegador não suporte `backdrop-filter` ou em modo de economia de bateria.
- **Risco de Legibilidade:** O efeito de vidro pode dificultar a leitura se a transparência for excessiva.
  - *Mitigação:** Definir níveis rígidos de opacidade mínima para superfícies que contêm texto.

## Architecture Decision Records
- [ADR-001: Seleção da Abordagem Visual "Premium Glass & Performance"](adrs/adr-001.md) — Define o uso de glassmorphism e foco na profissionalização do modo claro.

## Open Questions
- Existe alguma tela específica que você considera mais crítica para o teste inicial da nova paleta?
- Deseja manter o degradê atual nos botões ou prefere cores sólidas e minimalistas?
