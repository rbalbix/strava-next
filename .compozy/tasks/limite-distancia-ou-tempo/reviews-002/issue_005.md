---
provider: manual
pr:
round: 2
round_created_at: 2026-10-04T21:42:03Z
status: resolved
file: src/components/ThresholdAlertModal.tsx
line: 43
severity: low
author: claude-code
provider_ref:
---

# Issue 005: Agrupamento do alerta usa gearName como chave em vez de gearId

## Review Comment

`groupItemsByGear` (linha 40) usa `acc[item.gearName]` como chave do reduce
(linhas 43-44 e 50). O PRD exige que o modal "liste os itens agrupados por
bicicleta"; com duas bikes de nome igual no Strava (ex.: ambas "Bike" —
cenário comum), os itens das duas caem no MESMO grupo, rotulado com o nome da
primeira — a segunda bike some como grupo próprio e seus itens aparecem
misturados. A navegação continua correta (cada item carrega o próprio `gearId`,
e o `<li>` usa `group.gearId` como key), então o impacto é de apresentação.

Verificado antes de flagrar: pré-existente (a estrutura do reduce está no HEAD;
a feature só renomeou campos dentro dele) e nunca trackeado; sem comentário ou
decisão documentada que justifique agrupar por nome.

Correção sugerida — chave identidade, rótulo nome:

```ts
if (!acc[item.gearId]) {
  acc[item.gearId] = { gearId: item.gearId, gearName: item.gearName, ... };
}
acc[item.gearId].equipments.push(item);
```

Cobrir com fixture de dois gears de mesmo nome.

## Triage

- Decision: `VALID`
- Notes: Causa raiz confirmada: `acc[item.gearName]` nas linhas 43-50 — dois gears de mesmo nome colapsam num grupo só, violando o "agrupa por bicicleta" do PRD (impacto só de apresentação; navegação usa `gearId`). Pré-existente, sem decisão documentada que justifique chave por nome. Correção: chave `acc[item.gearId]` (rótulo continua `item.gearName`; o `<li key={group.gearId}>` já é compatível). Teste novo em `threshold-alert-modal.test.tsx` com dois gears homônimos: espera dois `<li>` de grupo e navegação para o `gearId` correto.
