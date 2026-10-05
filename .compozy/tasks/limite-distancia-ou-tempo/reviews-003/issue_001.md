---
provider: manual
pr:
round: 3
round_created_at: 2026-10-05T13:32:05Z
status: resolved
file: src/components/ThresholdAlertModal.tsx
line: 100
severity: low
author: claude-code
provider_ref:
---

# Issue 001: Ordem dos grupos de bike vira ascendente por gearId numérico

## Review Comment

Efeito colateral do fix da issue_005 da rodada 2 (`acc[item.gearId]` em vez
de `acc[item.gearName]`): `groupItemsByGear` acumula num objeto literal
`{}` (linhas 43-57) e o render faz `Object.values(groupedItems)` (linha 100).
Chaves de objeto com formato de inteiro (`'111'`, `'77654321'`) enumeram
**primeiro e em ordem crescente**; chaves texto enumeram em ordem de
inserção. Os gearIds reais são ids numéricos da Strava (`SummaryGear.id:
string`, valores tipo `"77654321"`), então em produção os grupos passam a
renderizar em ordem crescente de gearId, e não na ordem de inserção
(que seguia a ordem do dashboard). Antes do fix a chave era o `gearName`
sempre não-numérico → ordem de inserção.

Exemplo de enumeração comprovado em Node:
`Object.keys` de `{'Bike Z', '77654321', 'Bike A', '111'}` →
`["111", "77654321", "Bike Z", "Bike A"]`.

Impacto: apenas de apresentação (o PRD exige agrupar por bike, não
ordenação), mas é uma mudança de comportamento introduzida pelo próprio
fix e indetectável pelos testes atuais: o teste novo usa ids não-numéricos
(`'gear-1'`, `'gear-2'`), que caem no ramo de ordem de inserção.

Correção sugerida: preservar ordem de inserção explicitamente — trocar o
acumulador por `Map` (ordem de inserção garantida) ou prefixar a chave
(`acc[\`g:${item.gearId}\`]`, mantendo `group.gearId` como campo). Alternativa
documentar que ordenar por gearId é aceitável e usar ids numéricos no
teste de agrupamento para travar a ordem escolhida.

## Triage

- Decision: `VALID`
- Notes: Premissa comprovada por execução direta em Node (chaves `'111'`/`'999'` enumeram antes e em ordem crescente) e por teste RED recém-escrito: com o acumulador atual o grupo `111` renderiza antes do `999`. Causa-raiz: efeito colateral do fix da issue_005 da rodada 2 — trocar a chave para `gearId` fez ids numéricos da Strava (valores canônicos de inteiro) serem reordenados pela semântica de enumeração de objetos JS, mudança invisível aos testes porque os fixtures usam ids não-numéricos. Correção escolhida: acumulador `Map` (ordem de inserção por spec), com os 2 consumidores ajustados — `groupedItems.size > 0` em `hasValidItems` e `Array.from(groupedItems.values())` no render — porque `Object.keys`/`Object.values` sobre um Map não refletem a ordem de inserção; `group.gearId` continua sendo o campo do grupo e a chave do `<li>`. Prefixo de chave (`g:`) foi considerado e descartado: funciona num único ponto de edição mas mantém o código dependente do formato da chave (quebra silenciosa se alguém "limpar" o prefixo); o Map torna a intenção explícita.
