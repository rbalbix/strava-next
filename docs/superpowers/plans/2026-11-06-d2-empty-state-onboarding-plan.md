# Plano — D2: Empty state + onboarding one-shot

> **Data:** 2026-11-06 · **Design:** `docs/superpowers/specs/2026-11-06-d2-empty-state-onboarding-design.md` (aprovado)
> **Gate final:** `yarn validate` + `yarn lint:colors` verdes.
> **Nota:** o skill `superpowers:writing-plans` não está disponível neste ambiente; este plano foi escrito diretamente do design aprovado.

## Passo 1 — Branch

Criar `feat/d2-empty-state-onboarding` a partir de `main` (hoje limpo, exceto
`docs/superpowers/` não rastreado — o design vai junto).

## Passo 2 — Empty state no `CardDetailModal`

Arquivos: `src/components/CardDetailModal.tsx`, `src/styles/components/CardDetailModal.module.css`

1. `CardDetailModal.tsx:49` — adicionar `openModal` ao contexto já consumido:
   `const { signOut, openModal } = useContext(AuthContext);`
2. Envolver o bloco `<ul className={styles.timeline}>` (linha 252) em condição:
   - `isBikeActivity && equipments.length === 0` → novo `<div className={styles.emptyState}>`:
     - `<p>` com a mensagem exata: **"Você ainda não registrou manutenção para nenhum componente da sua bike"**
     - `<button type='button'>` **"Ver como funciona"** → `onClick={() => openModal('info')}`
   - senão → o `<ul>` de hoje, **inalterado** (tênis/não-bike continua com o `<ul>` vazio atual).
3. CSS `.emptyState` no module: centrado, padding, mensagem com `var(--gl-text-primary)`,
   botão seguindo o padrão visual dos botões já existentes no arquivo
   (`.thresholdRow button` como referência). Só tokens existentes → `lint:colors` aprova.

## Passo 3 — One-shot no `Stats`

Arquivo: `src/components/Stats.tsx` (ramo `if (dashboard)`, a partir da linha 190)

Logo após gravar o cache em `sessionStorage`, antes da lógica de `threshold-alert`:

```ts
// Onboarding one-shot (design D2): primeira carga com zero manutenções
// registradas ensina a mecânica central sem depender do menu. A flag é
// gravada ANTES de abrir — protege contra duplo efeito (StrictMode) e
// contra o poll de 60s reabrir a modal.
const totalRegisteredEvents = (dashboard.gearStats ?? []).reduce(
  (sum, gear) => sum + (gear.equipments?.length ?? 0),
  0,
);
if (
  totalRegisteredEvents === 0 &&
  !localStorage.getItem('gl_onboardingShown')
) {
  localStorage.setItem('gl_onboardingShown', '1');
  openModal('info');
}
```

- `openModal` já está em escopo no componente (usado no `threshold-alert`).
- Condição é mutuamente exclusiva com `threshold-alert` (overdue implica eventos > 0).
- Só o ramo de dados frescos dispara; o cache de `sessionStorage` não conta.

## Passo 4 — Testes

### 4a. Novo arquivo `tests/unit/components/card-detail-modal.empty.test.tsx`

Harness copiado de `card-detail-modal.save.test.tsx` (mocks de `apiClient`,
`ToastContext`, `AuthContext.Provider` com `openModal: vi.fn()`):

| # | Caso | Asserção |
|---|---|---|
| 1 | Bike (`activityType: 'RoadRide'`) com `equipments: []` | Mensagem + botão "Ver como funciona" visíveis; clique → `openModal` chamado com `'info'` |
| 2 | Bike com eventos (fixture atual) | Mensagem **ausente** (regressão) |
| 3 | Tênis (`activityType: 'Run'`) com `equipments: []` | Mensagem **ausente** |

### 4b. Estender `tests/unit/components/stats.test.tsx`

Adicionar `localStorage.clear()` no `beforeEach` (junto ao `sessionStorage.clear()` existente):

| # | Caso | Asserção |
|---|---|---|
| 4 | Dashboard com `equipments: []` + sem flag | `openModal('info')` chamado exatamente 1× e flag `gl_onboardingShown` gravada; re-render com novo dashboard → **não** reabre |
| 5 | Dashboard com eventos (fixture existente) | `openModal` **não** chamado; flag não gravada |

## Passo 5 — Gates

`yarn validate` (lint + lint:colors + typecheck + test + build) e `yarn lint:colors`.
Suíte de referência: 58 arquivos / 389 testes + os novos.

## Passo 6 — Manutenção do plano (paralela, prometida no design)

`docs/plano-usabilidade-gearlife.md`:

1. **§8.1 (linha A4) e §8.4 (linha D1):** registrar que o chip "Registrado" foi
   **removido** pelo proprietário (commit `bb2125a`, 2026-11-04) — hoje a confirmação
   visual é só o chip de distância/tempo e o `aria-label` "recém-registrado, defina o limite".
2. **§8.4 / §8.12.3:** ancorar a remoção do fallback legado em **~2026-12-04**
   (janela de 30 dias do deploy de 2026-11-04), com pré-checagem da checklist de
   observabilidade do §8.12.4 (contagem de `strava:session:*`, taxa de 401 estável).
3. **§4 (linha D2) e §5 (Fase B):** marcar D2 como concluído com data e gate.

## Fora de escopo

Copiar código, pilha de modais, E2E, D1/D3/D4/D9, D13/D14/D15/D16.
