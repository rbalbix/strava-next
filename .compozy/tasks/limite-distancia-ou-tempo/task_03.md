---
status: completed
title: Migração do contrato para valor com unidade
type: refactor
complexity: critical
dependencies:
  - task_01
  - task_02
---

# Task 03: Migração do contrato para valor com unidade

## Overview

Esta é a mudança de tipo cruzada que coordena toda a feature: o valor de cada limite
passa de número puro para par valor+unidade, e os registros legados são normalizados
num único ponto de leitura. O comportamento observado não muda — todos os limites
continuam em quilômetros — mas a partir dela a camada de dados está pronta para
receber a unidade escolhida pelo atleta.

<critical>
- LEIA o PRD e a TechSpec antes de começar (seções "Data Models", "Core Interfaces" e "Impact Analysis").
- REFERENCIE a TechSpec para detalhes de implementação — não duplique aqui.
- FOQUE NO "QUE" — descreva o que precisa ser alcançado, não como.
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou pontos de problema.
- TESTES OBRIGATÓRIOS — esta task DEVE incluir testes nos entregáveis.
</critical>

<requirements>
- `EquipmentThresholds` DEVE passar a ser um mapa de pares valor+unidade.
- `getEquipmentThresholds` DEVE devolver sempre o formato canônico, convertendo todo
  registro legado numérico em par com unidade de quilômetros antes de retornar.
- `getEquipmentThresholds` DEVE ser o ÚNICO ponto do código que lê a chave Redis de
  limites — nenhum outro módulo pode acessá-la diretamente.
- `saveEquipmentThreshold` DEVE gravar o par valor+unidade e aceitá-lo por parâmetro no
  lugar do número avulso.
- A validação do serviço DEVE rejeitar valor não numérico, valor negativo e unidade fora
  de `km`/`h`, preservando as validações atuais de `athleteId`, `gearId` e `equipmentId`.
- O endpoint DEVE construir o par com a unidade de quilômetros — o campo de unidade só
  é aceito na requisição na task 04.
- `Stats.tsx` e `CardDetailModal.tsx` DEVEM ler o valor a partir do par nos pontos que
  hoje tratam o limite como número, mantendo a exibição idêntica.
- Nenhuma mudança de interface gráfica ou de formato de exibição é permitida nesta task.
</requirements>

## Subtasks

- [x] 3.1 Trocar o tipo de valor de `EquipmentThresholds` para o par valor+unidade.
- [x] 3.2 Implementar a normalização de registros legados na leitura do serviço.
- [x] 3.3 Adaptar a escrita do serviço para gravar o par, com validação de unidade.
- [x] 3.4 Fazer o endpoint montar o par a partir de `thresholdKm` com unidade fixa de km.
- [x] 3.5 Corrigir os leitores em `Stats.tsx` e `CardDetailModal.tsx` para extrair o valor do par.
- [x] 3.6 Atualizar os testes de serviço, de contrato e de integração para o formato novo.
- [x] 3.7 Confirmar que a exibição e o comportamento continuam idênticos aos de hoje.

## Implementation Details

Siga as seções "Data Models" e "Core Interfaces" da TechSpec para o formato persistido
e para as assinaturas. A chave Redis (`REDIS_KEYS.equipmentThresholds`) não muda.

Atenção aos pontos que tratam o limite como número e precisam extrair o valor:
`buildThresholdAlertItems` em `Stats.tsx`, a sincronização de `inputs` e a passagem de
props em `CardDetailModal.tsx`, e o retorno de `saveEquipmentThreshold`. O payload de
`sessionStorage['equipmentThresholds']` sai do serviço já normalizado, então o cache do
cliente não precisa de escrita extra.

Os testes existentes declaram o formato antigo em literais tipados
(`tests/unit/services/thresholds.test.ts` e `tests/unit/lib/apiClient.test.ts`) e os
de integração devolvem mocks no formato antigo — todos precisam ser atualizados junto.

### Relevant Files

- `src/contracts/api.ts` — tipo de valor de `EquipmentThresholds` muda.
- `src/services/thresholds.ts` — normalização na leitura e escrita do par.
- `src/pages/api/app/equipment-thresholds.ts` — monta o par ao repassar ao serviço.
- `src/components/Stats.tsx` — leitura do valor nos itens de alerta.
- `src/components/CardDetailModal.tsx` — leitura do valor na sincronização e no editor.
- `tests/unit/services/thresholds.test.ts` — literais no formato antigo.
- `tests/unit/lib/apiClient.test.ts` — literais no formato antigo.
- `tests/integration/equipment-thresholds.test.ts` — retorno do serviço.
- `tests/integration/dashboard.test.ts` — mocks do serviço.

### Dependent Files

- `src/components/CardItem.tsx` — continua recebendo número nesta task; migra na task 06.
- `src/lib/apiClient.ts` — só repassa payload e retorno; sem alteração de código.
- `src/utils/thresholds.ts` — a função da task 02 passa a ser consumida nas tasks 05 e 06.
- `src/hooks/useAutoSync.ts` — consome o dashboard já com o formato novo.

### Related ADRs

- [ADR-002: Modelo persistido `{ value, unit }` com normalização retrocompatível na leitura](adrs/adr-002.md) — decisão central desta task.
- [ADR-003: Resolução do valor atual por helper puro compartilhado](adrs/adr-003.md) — os leitores migrados aqui passarão a usar o helper.

## Deliverables

- `EquipmentThresholds` no formato par valor+unidade.
- Normalização de registro legado no serviço, com único ponto de leitura.
- Escrita do serviço gravando o par, com validação de unidade.
- Endpoint e leitores adaptados, com exibição inalterada.
- Testes de serviço, contrato e integração atualizados **(OBRIGATÓRIO)**.
- Testes de regressão dos componentes permanecendo verdes **(OBRIGATÓRIO)**.

## Tests

- Unit tests:
  - [x] Leitura com registro legado numérico devolve par com unidade de quilômetros.
  - [x] Leitura com registro já no formato novo preserva a unidade de horas.
  - [x] Leitura sem chave existente devolve mapa vazio.
  - [x] Escrita grava o par valor+unidade na chave Redis correta.
  - [x] Escrita rejeita unidade fora de `km`/`h`.
  - [x] Escrita rejeita valor negativo e valor não numérico, mantendo as mensagens atuais.
  - [x] Escrita rejeita `athleteId`, `gearId` ou `equipmentId` inválidos como hoje.
- Integration tests:
  - [x] `GET /api/app/equipment-thresholds` devolve o formato normalizado com 200.
  - [x] `POST /api/app/equipment-thresholds` com payload válido persiste e devolve 200.
  - [x] `POST` com payload inválido devolve 400 `{ error: 'Invalid payload' }`.
  - [x] `GET /api/app/dashboard` entrega `equipmentThresholds` no formato novo e mantém o caso de falha tolerada.
  - [x] `POST /api/app/equipment-thresholds` sem sessão devolve 401.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `yarn typecheck` verde após a migração de todos os leitores
- Exibição de limites em quilômetros idêntica à de antes da task (regressão visual nula)
- Nenhum módulo fora do serviço lendo a chave Redis de limites
