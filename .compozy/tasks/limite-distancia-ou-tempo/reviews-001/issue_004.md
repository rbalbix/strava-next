---
provider: manual
pr:
round: 1
round_created_at: 2026-10-03T23:21:17Z
status: resolved
file: src/components/HowItWorksContent.tsx
line: 163
severity: low
author: claude-code
provider_ref:
---

# Issue 004: Texto de ajuda promete regra de step que o salvamento não impõe

## Review Comment

A linha 163 afirma: "Em km o campo aceita múltiplos de 100; em horas, valores
inteiros de hora em hora."

Na prática o `step` (100 km / 1 h, definido no input na linha 250 do editor) apenas
faz as setas do spinbutton avançarem nesse incremento: `saveThreshold` não chama
`checkValidity()` e o zod do endpoint valida `z.number().min(0)`. Digitar 150 km ou
2,5 h salva normalmente — o texto dá a entender que valores fora do step seriam
rejeitados.

Além disso, a própria regra de formato decidida no PRD/TechSpec (`,.1f` para horas →
ex.: "48,0 h") pressupõe horas fracionárias, contradizendo "valores inteiros".

Impacto: documentação de ajuda que descreve comportamento inexistente (baixa, mas
visível ao usuáriologo abaixo do texto novo sobre o seletor).

Sugestão de correção — refletir o comportamento real, ex.: "As setas do campo avançam
de 100 em 100 km e de hora em hora; você também pode digitar qualquer valor na unidade
escolhida." Alternativamente, se a restrição for de fato desejada, validar o step em
`saveThreshold` — o que precisaria de registro na TechSpec e testes novos.

## Triage

- Decision: `VALID`
- Notes: Causa raiz confirmada: o texto documenta o `step` como regra de
  aceitação, mas `saveThreshold` não chama `checkValidity()` e o zod aceita
  `z.number().min(0)` — 150 km e 2,5 h salvam; e o formato `,,.1f` para horas
  pressupõe frações, contradizendo "valores inteiros". Verificado (grep em
  `tests/`) que NENHUM teste assera o texto antigo —
  `discovery-texts.test.tsx` só exige `'Salvar'` e a ausência de padrões
  "somente km". Correção escolhida: reescrever a frase para descrever o
  comportamento real (step = incremento das setas, qualquer valor pode ser
  digitado), mantendo a frase de "Trocar a unidade limpa"; validação de step no
  salvamento foi considerada e rejeitada por extrapolar o PRD/TechSpec (que
  definem apenas o atributo `step`). Teste guarda novo em
  `tests/unit/docs/discovery-texts.test.tsx`.
