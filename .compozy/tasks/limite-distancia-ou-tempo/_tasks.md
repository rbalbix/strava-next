# Limite de Manutenção por Equipamento com Unidade Selecionável — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Tipos de unidade do limite | completed | low | — |
| 02 | Helper puro de consumo do limite | completed | low | task_01 |
| 03 | Migração do contrato para valor com unidade | completed | critical | task_01, task_02 |
| 04 | Endpoint aceita a unidade escolhida | completed | low | task_03 |
| 05 | Alerta de manutenção na unidade do limite | completed | medium | task_02, task_03 |
| 06 | Barra de progresso na unidade do limite | completed | medium | task_02, task_03 |
| 07 | Editor de limite com seletor km ou horas | completed | medium | task_04, task_06 |
| 08 | Estilos do seletor e da barra de progresso | completed | low | task_06, task_07 |
| 09 | Textos de descoberta da unidade | completed | low | task_05, task_07, task_08 |
| 10 | Qualificação e regressão da feature | completed | medium | task_01, task_02, task_03, task_04, task_05, task_06, task_07, task_08, task_09 |
