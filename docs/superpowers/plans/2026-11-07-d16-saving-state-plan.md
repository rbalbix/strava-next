# Plano — D16 mínimo: estado "salvando" no editor de limite

> **Data:** 2026-11-07 · **Design:** `docs/superpowers/specs/2026-11-07-d16-saving-state-design.md` (aprovado)
> **Gate final:** `yarn validate` + `yarn lint:colors` verdes.
> **Nota:** o skill `superpowers:writing-plans` não está disponível neste ambiente; este
> plano foi escrito diretamente do design aprovado.
> **Restrição do proprietário (2026-11-07):** NÃO fazer commit, push nem PR nesta leva —
> o trabalho fica no working tree até liberação. Por isso o Passo 1 está adiado.
> **Ajustes pós-teste (2026-11-08):** largura fixa no botão (constante no
> spinner; o slot tentado antes foi revertido por desalinhar o ícone) + toast
> `Limite salvo [componente: valor unidade]` + duração do toast de 4s e quebra
> de linha — ver o addendum do design; as asserções dos testes acompanham o
> novo formato.

## Passo 1 — Branch (ADIADO até liberação)

`feat/d16-saving-state` a partir de `main`. No commit, **nunca** incluir
`docs/plano-usabilidade-gearlife.md` (artefato local — ver o cabeçalho do plano). Push e
PR só quando o proprietário liberar.

## Passo 2 — Estado `saving` + guard

Arquivo: `src/components/CardDetailModal.tsx`

1. Importar `ClipLoader` de `react-spinners` (após `react-icons/md` — ordem externa).
2. Novo estado junto aos demais (após `visibleEditorId`, linha 42):
   `const [saving, setSaving] = useState(false);` com comentário do D16.
3. `saveThreshold` (linha 113):
   - primeira linha: `if (saving) return;` — cobre clique duplo, Enter duplo e
     clique+Enter num ponto só;
   - antes do `try`: `setSaving(true);`
   - novo `finally { setSaving(false); }` — cobre sucesso, erro não-401 e o caminho 401.
4. Botão de salvar (linhas 338-344):
   - `aria-disabled={saving}` e `aria-busy={saving}`;
   - conteúdo condicional: `saving ? <ClipLoader size={20} color='var(--gl-surface-card)' /> : <MdOutlineSaveAlt size={20} />`.
5. Input do limite (linha 285): `readOnly={saving}`.

## Passo 3 — CSS

Arquivo: `src/styles/components/CardDetailModal.module.css`

Logo após `.thresholdRow button:hover` (linha 136):

```css
/* Estado "salvando" do D16: aria-disabled (não o disabled nativo) mantém o
   foco no caminho de falha — o guard em saveThreshold é quem bloqueia a
   nova requisição. O cursor sem hover evita o brightness do estado normal. */
.thresholdRow button[aria-disabled='true'] {
  cursor: default;
}

.thresholdRow button[aria-disabled='true']:hover {
  filter: none;
}
```

Sem cores novas → `lint:colors` sem risco.

## Passo 4 — Testes

Arquivo: `tests/unit/components/card-detail-modal.save.test.tsx` — novo `describe`
"D16 — estado salvando", reutilizando o harness existente (`mountModal`, `openEditor`,
`findButton`, `getValueInput`) + helper local `deferred<T>()`:

| # | Caso | Asserção |
|---|---|---|
| 1 | promessa pendente | `aria-disabled='true'`, `aria-busy='true'`, input `readOnly`; resolver → toast "Limite salvo" + editor fecha |
| 2 | clique duplo + Enter duplo na pendência | `saveEquipmentThreshold` **1 chamada**; resolver → toast de sucesso |
| 3 | rejeição não-401 | toast "Falha ao salvar limite", editor aberto, `aria-disabled` deixa de ser `true`, input volta a editável |
| 4 | regressão | suíte atual (incluindo os casos §8.13 deste arquivo) permanece verde |

## Passo 5 — Gates

1. `yarn validate` (lint + lint:colors + typecheck + test + build)
2. `yarn lint:colors`
3. `yarn test:report` → regenerar o Test Status do Readme; comparar com a baseline
   pós-D2 (Lines **99,69%** / Branches **94,46%**) — sem regressão.

## Passo 6 — Registro local (não commitado)

`docs/plano-usabilidade-gearlife.md`:

1. **§4 (linha D16):** anotação do escopo mínimo em execução + pendências.
2. **§5 (tabela de status + nota da Fase B):** D16 ⚠️ escopo mínimo; suspensões.
3. **§8.15:** perguntas × decisões do brainstorming de 2026-11-07, escopo executado,
   verificação e a restrição "sem commit/push/PR até liberação".

## Fora de escopo

Aviso de falha de carga (suspenso), botão "Remover limite" (aguarda visual), toast
fechável/duração (suspenso), alvos ≥44px (Fase D), E2E, mudança de API.
