---
title: Equipment maintenance dependency rules
date: 2026-05-29
status: accepted
accepted_date: 2026-05-29
accepted_by: Team (automated acceptance on user request)
tags: [maintenance, equipment, webhook, statistics]
---

# 0001 — Regras de dependência entre marcações de manutenção

## Status

Proposto — registra as regras já codificadas no `createStatistics()` e define o padrão para futuras alterações.

## Contexto

O sistema GearLife processa atividades do Strava e interpreta marcações na `private_note` (apenas para atividades sinalizadas com `*`) como eventos de manutenção para equipamentos (`Equipments`). Atualmente o comportamento no código é:

- Marcação por `equipment.id` reseta o contador daquele equipamento e registra a data/distância do evento.
- Existem exceções implementadas diretamente em `src/services/statistics.ts` que aplicam marcações correlacionadas para simplificar a UX/semântica do domínio.

## Decisão

1. Padrão: **Marcação independente.** Quando uma atividade contém uma marcação (ex.: `chain`), apenas o equipamento correspondente tem seu contador registrado/resetado.

2. Regras especiais (codificadas e mantidas):
   - `tubeless` marca automaticamente `tubes`, `fronttube` e `reartube` como registrados (câmaras são irrelevantes para instalação tubeless).
   - `brakes` marca `frontbrake` e `rearbrake` como registrados (tratamento em par para pastilhas de freio).
   - `suspension` / `newshock` marcam os itens de revisão/kit relacionados (`suspareview`, `suspakit`, `shockreview`, `shockkit`) como registrados quando aplicável.

3. Mudanças futuras nas dependências só serão aceitas quando documentadas por outro ADR (ou emenda a este), com justificativa que cubra o impacto no UX e nos cálculos de estatística.

## Alternativas Consideradas

- Alternativa A — Todas as marcações são independentes (nenhuma regra especial). Rejeitada: causa ruído UX (ex.: marcar `tubeless` sem tratar `tubes` deixaria câmaras aparentes como não registradas mesmo quando substituídas implicitamente).
- Alternativa B — Regras de dependência configuráveis por usuário/tenant via dados externos. Rejeitada pela complexidade e baixo benefício imediato.

## Consequências

- Documenta e harmoniza o comportamento atual do código com a linguagem do domínio.
- Garante que a equipe saiba onde estender ou modificar regras especiais: somente com ADR justificando trade-offs.
- Mantém a regra padrão de marcação independente, reduzindo surpresas para novos colaboradores.

## Implementação / Referências

- Código de referência: `src/services/statistics.ts` (função `createStatistics`).
- Observabilidade: métricas de processamento de atividade e logs em `src/services/metrics.ts` e `src/services/logger.ts`.

---

Se aprovada, este ADR deve ser marcada como `accepted` e referenciada em futuras PRs que alterem `createStatistics()` ou o comportamento de marcações.
