---
provider: manual
pr:
round: 2
round_created_at: 2026-10-04T21:42:03Z
status: resolved
file: tests/unit/components/card-detail-modal.save.test.tsx
line: 141
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Teste dirige o próprio mock e grava sessionStorage à mão

## Review Comment

O teste "calls saveEquipmentThreshold and updates sessionStorage" (linha 141)
não exercita componente algum:

1. renderiza o modal e só verifica `textContent` contém 'Bike A';
2. chama o **mock** `apiClient.saveEquipmentThreshold(...)` diretamente
   ("Testa a API diretamente em vez de depender da UI");
3. grava `sessionStorage.setItem('equipmentThresholds', ...)` **à mão**
   ("para simular o que o componente faria");
4. assera que o mock foi chamado com aqueles argumentos (tautologia — quem
   chamou foi o próprio teste) e que o sessionStorage é igual ao que ele mesmo
   acabou de escrever.

Nenhuma asserção depende do comportamento do `CardDetailModal`; o teste não
poderia falhar por bug algum na feature — falsa confiança num caminho crítico
(save + cache). É exatamente o padrão "tests that verify mocks instead of
behavior" dos critérios de review. Dentro dele ainda há um
`await new Promise((r) => setTimeout(r, 200))` **fora de `act()`** (linha 149),
que deixaria updates de estado do React acontecerem fora do wrapper.

Verificado antes de flagrar: o teste é pré-existente (existe no HEAD), mas o
fluxo real já é coberto por testes adequados adicionados pela feature —
"fluxo de abertura, edição e salvamento pela UI atualiza o cache" (linha 353) e
"salva ao pressionar Enter" (linha 397) — então ele só agrega ruído.

Correção sugerida: **deletar o teste** (a cobertura real já existe); se quiserem
mantê-lo como verificação de contrato do apiClient, reescrever para dirigir a
UI (abrir editor → digitar → Salvar) e asserar o `sessionStorage` escrito pelo
próprio componente.

## Triage

- Decision: `VALID`
- Notes: Causa raiz confirmada lendo o teste: ele chama o mock diretamente, grava o `sessionStorage` à mão e assera essas próprias ações — nenhuma asserção depende do componente (tautológico; padrão "verifies mocks instead of behavior"). Pré-existente no HEAD, mas redundante agora: o fluxo real é coberto por "fluxo de abertura, edição e salvamento pela UI atualiza o cache" (353) e "salva ao pressionar Enter" (397). Correção: **deletar o teste inteiro** — isso também elimina o `setTimeout(200)` fora de `act()` (linha 149) apontado na issue; nenhuma cobertura de src se perde (o teste não exercitava caminho nenhum do componente).
