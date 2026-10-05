---
provider: manual
pr:
round: 1
round_created_at: 2026-10-03T23:21:17Z
status: resolved
file: tests/unit/lib/apiClient.test.ts
line: 95
severity: low
author: claude-code
provider_ref:
---

# Issue 005: Teste de unidades no apiClient é tautológico e não testa comportamento

## Review Comment

O teste "accepts km and h as threshold units and rejects other literals"
(linha 95) monta `[kmUnit, hUnit, invalidUnit]` e espera
`toEqual(['km', 'h', 'minutos'])` — comparação que **sempre passa** em runtime, já
que as mesmas variáveis foram recém-declaradas com aqueles literais. Ele não toca
`apiClient` nem nenhum comportamento sob teste e dá falsa sensação de cobertura.

A parte útil do bloco é o `@ts-expect-error` (a rejeição de `'minutos'` é
compile-time e já é exercitada pelo `yarn typecheck` dentro de `yarn validate`); a
asserção de runtime é ruído, e o teste está num arquivo dedicado ao `apiClient`.

Sugestão de correção — remover a asserção de runtime e manter só a checagem de tipo
(num arquivo de teste de tipos, se o repositório quiser documentá-la), ou substituir
por uma asserção real: a rejeição de unidades inválidas em runtime acontece no zod do
endpoint e já está coberta por "returns 400 when the unit is outside km/h" em
`tests/integration/equipment-thresholds.test.ts` — nesse caso, basta deletar o teste
daqui.

## Triage

- Decision: `VALID`
- Notes: Causa raiz confirmada: a asserção de runtime compara variáveis recém-declaradas com os mesmos literais — sempre verdade, não exercita `apiClient`. Verificado que a rejeição em runtime de unidade inválida já está coberta por "returns 400 when the unit is outside km/h" em `tests/integration/equipment-thresholds.test.ts`, e que a checagem `@ts-expect-error` é redundante com o `yarn typecheck` do `yarn validate` (o tipo `ThresholdUnit` impede o literal em qualquer código compilado). Correção escolhida: deletar o teste e o import `ThresholdUnit` do arquivo (fica sem uso e a lint reprovaria).
