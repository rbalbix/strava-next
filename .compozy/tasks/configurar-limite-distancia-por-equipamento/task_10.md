---
status: pending
title: Documentação e PR: atualizar README e registrar passos de deploy
type: docs
complexity: low
dependencies: [task_01..task_09]
---

## Overview

Atualizar documentação do repositório com instruções de uso da nova feature, keys Redis, e passos para testes e deploy. Preparar descrição do PR com lista de arquivos modificados, rationale (link para ADRs) e checklist de QA.

<critical>
- Incluir instruções de rollback se necessário.
- Referenciar ADRs e TechSpec gerados.
</critical>

<requirements>
1. Atualizar `Readme.md` ou `docs/` com seção "Limites de Distância por Equipamento" (pt-BR).
2. Incluir chave Redis `strava:equipment-thresholds:<athleteId>` em `src/config/index.ts` e documentação de formato JSON.
3. Adicionar checklist de QA e comandos para rodar testes localmente.
</requirements>

## Subtasks

- Atualizar `Readme.md` com a nova seção (pt-BR).
- Criar o corpo do PR em `.compozy/tasks/.../pr_description.md` contendo resumo, arquivos e checklist.

## Deliverables

- Documentação atualizada e PR description pronta para colar em GitHub.

## Success Criteria

- PR description clara com checklist para reviewers.
- Documentação suficiente para QA e deploy.
