---
provider: manual
pr:
round: 2
round_created_at: 2026-10-04T21:42:03Z
status: resolved
file: src/components/Stats.tsx
line: 139
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Chave do Set de alertas suprime o alerta da segunda bike

## Review Comment

`alertedEquipmentIds` (linha 139) é um `Set<string>` indexado **apenas por
`equipmentId`** — e os ids de equipamento são um catálogo estático global:
`src/services/equipment.ts` define `id: 'chain'`, `'tires'`, `'suspension'`…
e `src/services/statistics.ts` (`gears.forEach` → `Object.values(Equipments)`)
repete os MESMOS ids em cada gear. Multi-gear é o caso normal
(`tests/unit/services/gear.test.ts`: `bike-1`, `bike-2`, `shoe-1`), e os
próprios limites são persistidos por gear (`{[gearId]: {[equipmentId]: entry}}`).

Cenário: a bike A ultrapassa o limite da corrente → alerta exibido,
`add('chain')`. Meses depois a bike B ultrapassa a corrente → o filtro
`newOverdueItems = currentOverdueItems.filter(item =>
!alertedEquipmentIds.current.has(item.equipmentId))` (~linha 206) descarta o
item e **o alerta da bike B nunca aparece**. A limpeza (~linha 222) só remove a
chave quando NENHUM gear está vencido com aquele id, então a bike B permanece
silenciada enquanto a A oscilar. O modal até agrupa por bike corretamente —
`ThresholdAlertModal` indexa linhas por `` `${gearId}-${equipmentId}` `` — só o
deduplicador do `Stats` usa a chave errada.

Nota de honestidade: o padrão é **pré-existente** (existe no HEAD), não foi
introduído por esta feature; mas nunca foi trackeado, o bug é real e a feature
justamente mexe no fluxo de alerta deste arquivo (renomeia campos e filtra
`item.limit > 0`), então é um bloqueio legítimo: o alerta de vencimento é a
promessa central do produto e falha em silêncio para atletas com mais de uma
bike.

Correção sugerida — chave por par em todos os 4 pontos (cache-init ~163,
filtro ~206, add ~216, cleanup ~222):

```ts
const alertKey = (item: { gearId: string; equipmentId: string }) =>
  `${item.gearId}:${item.equipmentId}`;
```

Cobrir com teste de dashboard com DOIS gears em que a corrente de cada um fica
vencida em momentos distintos — `stats.test.tsx` hoje só usa fixture de um
gear, por isso o caminho é invisível para os testes.

## Triage

- Decision: `VALID`
- Notes: Causa raiz confirmada por inspeção direta: `statistics.ts` (`gears.forEach` → `Object.values(Equipments)`) distribui os MESMOS ids estáticos (`equipment.ts`) em todo gear, e os 4 pontos do `Stats.tsx` (cache-init 163-165, filtro 206-208, add 215-217, cleanup 220-228) usam `item.equipmentId` cru como identidade — o filtro descarta a bike B porque a chave `chain` já veio da bike A. Pré-existente no HEAD, mas nunca trackeado e real. Correção: helper `thresholdAlertKey(item) => `${gearId}:${equipmentId}`` aplicado nos 4 pontos (a identidade já usada pelo `ThresholdAlertModal`); teste novo em `stats.test.tsx` com dashboard de DOIS gears cujas correntes ficam vencidas em momentos distintos — com a chave antiga o segundo `openModal` nunca dispara, então o teste é guarda real da regressão.
