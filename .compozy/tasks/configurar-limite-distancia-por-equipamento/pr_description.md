# PR: Configurar limite de distância por equipamento com alerta visual

## Resumo

Esta PR adiciona suporte a limites de distância por equipamento (thresholds), com persistência no Redis, endpoints de API para leitura/gravação, uma modal de alerta quando equipamentos ultrapassam seus limites, e UI para editar limites no modal de detalhe do equipamento.

## Arquivos/modificações principais

- `src/config/index.ts` — nova chave Redis `equipmentThresholds`.
- `src/services/thresholds.ts` — serviço para ler/gravar thresholds no Redis.
- `src/pages/api/app/equipment-thresholds.ts` — endpoint GET/POST.
- `src/pages/api/dashboard.ts` — inclui `equipmentThresholds` no payload do dashboard.
- `src/contracts/api.ts` — tipos `EquipmentThresholds`, `EquipmentThresholdsRequest/Response`.
- `src/lib/apiClient.ts` — `getEquipmentThresholds()` e `saveEquipmentThreshold()`.
- `src/components/Stats.tsx` — carrega thresholds e dispara a modal `threshold-alert` quando necessário.
- `src/components/ThresholdAlertModal.tsx` — nova modal de alerta.
- `src/components/ModalContainer.tsx` — mapeia `threshold-alert` para o modal.
- `src/components/CardDetailModal.tsx` — editor de limite por equipamento (Salvar).
- `src/components/CardItem.tsx` — barra de progresso compacta e estados `normal|warning|overdue`.
- Testes: unitários e integração adicionados/atualizados em `tests/unit` e `tests/integration`.
- Documentação: `Readme.md` e `src/components/HowItWorksContent.tsx` atualizados para descrever a nova feature.

## Rationale / Links

- Especificação técnica: `.compozy/tasks/configurar-limite-distancia-por-equipamento/_techspec.md`
- Decisão arquitetural: `docs/adr/adr-001.md`, `docs/adr/adr-002.md`

## QA Checklist (para reviewers)

- [ ] Revisar endpoints: `GET /api/app/equipment-thresholds` e `POST /api/app/equipment-thresholds` (validar auth e payloads).
- [ ] Rodar testes unitários e de integração localmente: `yarn vitest` (ou `yarn test`).
- [ ] Testar fluxo manual:
  - Fazer login e confirmar dashboard carrega normalmente.
  - Abrir detalhe de uma bike/gear, definir limite para um componente e clicar `Salvar`.
  - Confirmar `equipmentThresholds` foi atualizado (via `sessionStorage` no cliente) e que a barra de progresso aparece.
  - Ajustar limite para um valor baixo e reabrir app → confirmar `ThresholdAlertModal` aparece se houver itens `overdue`.
- [ ] Verificar logs/erros no servidor durante chamadas ao endpoint.

## Rollback

- Remover chave `equipmentThresholds` do código no `src/config/index.ts` e reverter as alterações no backend/API.
- Reverter este branch no GitHub (abrir PR de rollback) caso seja necessário.

## Comandos úteis

```sh
# executar testes relevantes
yarn vitest tests/unit/services/thresholds.test.ts tests/integration/equipment-thresholds.test.ts

# rodar todos os testes
yarn vitest

# validar tipo e lint
yarn typecheck --noEmit && yarn lint
```

## Observações finais

- A chave Redis usada é `strava:equipment-thresholds:<athleteId>` e armazena um JSON com a forma `{ [gearId]: { [equipmentId]: number } }`.
- A modal de alerta só é exibida quando existirem equipamentos com estado `overdue`.

---

Feito com ❤️ — pronto para revisão.
