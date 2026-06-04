# Configurar limite de distância por equipamento com alerta visual — Task List

## Tasks

| #   | Title                                                                      | Status    | Complexity | Dependencies                       |
| --- | -------------------------------------------------------------------------- | --------- | ---------- | ---------------------------------- |
| 01  | Atualizar `REDIS_KEYS` com `equipmentThresholds`                           | completed | low        | —                                  |
| 02  | Criar serviço de persistência `thresholds` (Redis)                         | completed | medium     | task_01                            |
| 03  | Endpoint API `/api/app/equipment-thresholds` (GET/POST)                    | completed | medium     | task_01, task_02                   |
| 04  | Incluir `equipmentThresholds` no payload de `/api/app/dashboard`           | pending   | medium     | task_02, task_03                   |
| 05  | Atualizar `contracts/api.ts` e `lib/apiClient.ts` para suportar thresholds | completed | low        | task_04                            |
| 06  | Carregar thresholds em `Stats.tsx` e acionar lógica de alerta              | pending   | medium     | task_05                            |
| 07  | Criar `ThresholdAlertModal` e integrar em `ModalContainer`                 | pending   | medium     | task_06                            |
| 08  | Editar/Salvar limite no `CardDetailModal` e exibir progresso em `CardItem` | pending   | medium     | task_05, task_06                   |
| 09  | Testes unitários e de integração para API e componentes                    | pending   | medium     | task_02, task_03, task_06, task_08 |
| 10  | Documentação e PR: atualizar README e registrar passos de deploy           | pending   | low        | task_01..task_09                   |
