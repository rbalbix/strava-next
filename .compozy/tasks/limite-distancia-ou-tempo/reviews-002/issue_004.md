---
provider: manual
pr:
round: 2
round_created_at: 2026-10-04T21:42:03Z
status: resolved
file: tests/unit/components/card-detail-modal.save.test.tsx
line: 72
severity: low
author: claude-code
provider_ref:
---

# Issue 004: Esperas por sleep() de relógio nos testes da feature

## Review Comment

Os testes desta feature esperam tempo de parede em vez de promises resolvidas:

- `card-detail-modal.save.test.tsx:72` — `await sleep(200)` em todo
  `mountModal()`; `:126` (`clickAndFlush`), `:443`, `:469` — `await sleep(20)`
  após cada clique;
- `tests/regression/threshold-unit-flows.test.tsx:95` — `sleep(200)`;
  `:152` — `sleep(20)`.

Verificado: nenhum `sleep(` existia nesses arquivos no HEAD — o padrão foi
introduzido pela feature. As promises subjacentes são mocks já resolvidos, então
o sleep só adiciona ~3s de espera real à suíte e mascara o que se deveria
esperar (flush de microtasks). O buffer de 200ms também é o clássico gatilho de
teste intermitente sob carga de CI: se o timer não bastar, o estado não apareceu
e a asserção falha de forma dependente de tempo (critério "flaky test
patterns"). Hoje a suíte é estável — por isso low — mas é dívida de
robustez, não de cobertura.

Correção sugerida: substituir por flush determinístico dentro de `act`
(`await act(async () => {})` após o disparo, ou `waitFor`/`findBy*` do
Testing Library) e manter apenas o loop assíncrono fake-Redis (que é I/O real do
mock) dentro de `act`. Um caso extra: a `sleep` fora de `act` na linha 149 morre
junto com o teste da issue_003 desta rodada, se ele for deletado.

## Triage

- Decision: `VALID`
- Notes: Confirmado por grep: nenhum `sleep(` existia nesses arquivos no HEAD — padrão introduzido pela feature; mocks já resolvidos, então as esperas são flush de microtasks disfarçado de relógio. Correção: substituir por flush determinístico — `await act(async () => {})` após o render em `mountModal` (ambos os arquivos) e manter apenas `await act(async () => { fireEvent... })` (o próprio `act` assíncrono drena as microtasks do mock) nos cliques de `clickAndFlush`, dos testes de Enter/erro em `save.test` e de `saveThroughEditor` na regressão; **remover também os helpers `const sleep`** de ambos os arquivos (ficariam sem uso e a lint reprovaria). A `sleep` fora de `act` na linha 149 vai embora junto com o teste da issue_003. Fallback previsto: se algum flush determinístico não bastar (gate falhar), usar `waitFor`/`findBy*` — sem voltar a sleeps de parede.
