# TechSpec: Limite de manutenção por equipamento com unidade selecionável (km ou horas de pedalagem)

## Executive Summary

Esta especificação adiciona uma unidade variável ao limite por equipamento sobre a
infraestrutura existente, sem novos pacotes, pastas, serviços ou dependências. Três
decisões estruturam o trabalho: o par (valor, unidade) passa a ser persistido como
`{ value, unit }` e os registros numéricos legados são normalizados para `unit: 'km'`
num único ponto de leitura (o serviço); o POST ganha `unit: z.enum(['km','h'])`
com `.default('km')` dentro do schema `.strict()` atual, preservando clientes com
bundle cacheado; e a pergunta "qual é o valor consumido agora?" vira um helper puro
compartilhado por `Stats.tsx` e `CardItem.tsx`, de modo que alerta e barra de
progresso nunca divergam. A grandeza para horas já existe — `equipment.movingTime`
em segundos, zerado no snapshot de manutenção — então não há medição nova, apenas
uma escolha de qual número comparar.

**Trade-off técnico principal:** aceitamos normalização em tempo de leitura e um tipo
internamente misto (o Redis devolve `number | ThresholdEntry`) em troca de zero
migração de produção. A alternativa — um job de migração reescrevendo a chave
`strava:equipment-thresholds:<athleteId>` — daria um shape único armazenado, mas
exigiria janela de migração sem retorno garantido para um dado não-crítico. Em
contrapartida, toda leitura carrega uma linha de lógica que precisa de teste para não
regredir, e qualquer código que leia a chave fora de `getEquipmentThresholds` verá o
tipo errado.

## System Architecture

### Component Overview

Fluxo de dados, da persistência às duas superfícies de exibição:

```
Upstash Redis
  strava:equipment-thresholds:<athleteId>
        │  leitura (normaliza legado → {value, unit})
        ▼
src/services/thresholds.ts ──── getEquipmentThresholds / saveEquipmentThreshold
        │                                   │
        ├──── GET/POST /api/app/equipment-thresholds  (zod .strict() + unit)
        │                                   │
        └──── GET /api/app/dashboard → DashboardResponse.equipmentThresholds
                                            │
                          sessionStorage['equipmentThresholds'] (cache)
                                            │
                                            ▼
                              Stats.tsx · buildThresholdAlertItems
                                            │  resolveCurrentConsumption()
                                            ▼
                     ThresholdAlertModal ← ModalContainer (payload)
                                            ▲
                                            │
                    CardDetailModal ── saveThreshold() ── apiClient
                          │ editor: input + seletor km|h
                          ▼
                       CardItem ── barra de progresso (anúncio da unidade)
```

**Componentes e responsabilidades:**

| Componente | Responsabilidade | Fronteira |
|---|---|---|
| `src/contracts/api.ts` | Tipos `ThresholdEntry`, `EquipmentThresholds`, `EquipmentThresholdsRequest` | Só tipos; nenhum runtime |
| `src/services/thresholds.ts` | Persistência + normalização retrocompatível | Único leitor da chave Redis |
| `src/pages/api/app/equipment-thresholds.ts` | Validação zod e despacho GET/POST | Fronteira HTTP, `withProtectedAPI` |
| `src/utils/thresholds.ts` | `resolveCurrentConsumption` + `computeThresholdState` | Puro, sem React e sem Redis |
| `src/lib/apiClient.ts` | Payload do POST | Fronteira de rede do cliente |
| `src/components/CardDetailModal.tsx` | Estado do editor e seletor de unidade | Único local de escrita |
| `src/components/CardItem.tsx` | Barra de progresso sem rótulo interno e com acessibilidade | Somente exibição |
| `src/components/Stats.tsx` | Montagem dos itens de alerta e gatilho do modal | Único produtor de alert items |
| `src/components/ThresholdAlertModal.tsx` | Apresentação `valor / limite` na unidade certa | Somente exibição |
| `src/components/ModalContainer.tsx` | Payload inline do `threshold-alert` | Só o tipo inline |
| `src/components/HowItWorksContent.tsx` + `Readme.md` | Textos de descoberta | Conteúdo estático |

**Interações com sistemas externos:** nenhuma. Redis Upstash e Strava já fazem parte
do caminho existente; esta feature não acrescenta chamada de rede, endpoint novo,
dependência nem serviço.

## Implementation Design

### Core Interfaces

O tipo que todos os demais dependem — definido em `src/contracts/api.ts`:

```ts
export type ThresholdUnit = 'km' | 'h';

export type ThresholdEntry = {
  value: number;
  unit: ThresholdUnit;
};

export type EquipmentThresholds = Record<string, Record<string, ThresholdEntry>>;
```

Contrato de persistência (`src/services/thresholds.ts`):

```ts
export async function getEquipmentThresholds(
  athleteId: number,
): Promise<EquipmentThresholds>; // sempre o shape canônico; normaliza legado

export async function saveEquipmentThreshold(
  athleteId: number,
  gearId: string,
  equipmentId: string,
  entry: ThresholdEntry,          // era thresholdKm: number
): Promise<EquipmentThresholds>;
```

A regra compartilhada de "valor consumido agora" (`src/utils/thresholds.ts`):

```ts
export function resolveCurrentConsumption(
  entry: ThresholdEntry,
  equipment: { distance?: number; movingTime?: number },
): number {
  return entry.unit === 'h'
    ? (equipment.movingTime ?? 0) / 3600
    : (equipment.distance ?? 0) / 1000;
}
```

Convenções de erro: o serviço continua lançando `Error` com mensagem descritiva
(`'threshold value must be a number'`, `'unit must be km or h'`); a rota continua
convertendo falha de validação zod em `400 { error: 'Invalid payload' }` e degrada
falha de leitura do dashboard em log, sem alterar o status da resposta.

### Data Models

**Persistido em Redis** (chave `strava:equipment-thresholds:<athleteId>`, sem TTL):

```jsonc
{
  "bikeA": {
    "chain":     { "value": 120,  "unit": "km" },   // novo formato
    "fork":      { "value": 50,   "unit": "h"  },
    "tire-rear": 180                              // legado, ainda aceito na leitura
  }
}
```

A normalização acontece exclusivamente em `getEquipmentThresholds`: cada número
bruto vira `{ value: number, unit: 'km' }` antes de sair do serviço. Nenhum outro
módulo lê a chave.

**Request** (`EquipmentThresholdsRequest`):

```ts
type EquipmentThresholdsRequest = {
  gearId: string;
  equipmentId: string;
  thresholdKm: number;   // mantém o nome: é o valor, a unidade vem em `unit`
  unit?: ThresholdUnit;  // ausente → 'km'
};
```

**Response** (`EquipmentThresholdsResponse` e `DashboardResponse.equipmentThresholds`):
inalterados em forma, agora com `ThresholdEntry` como valor. `DashboardResponse`
continua tolerante — se a leitura falhar, o campo é omitido e o dashboard responde 200.

**Cache do cliente:** `sessionStorage['equipmentThresholds']` guarda o valor já
normalizado devolvido pelo serviço, portanto já sai no shape novo; escrito em
`Stats.tsx` e `CardDetailModal.tsx`, limpo no logout em `AuthContext.tsx`.

**Estado do editor** (`CardDetailModal.tsx`): além de `inputs: Record<string, string>`,
um `unitInputs: Record<string, ThresholdUnit>` inicializado a partir do limite salvo
(`km` quando não há limite). Trocar o segmento mantém `inputs[equipmentId]`.

### API Endpoints

Nenhum endpoint novo. Os dois existentes mudam de contrato:

**`POST /api/app/equipment-thresholds`**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `gearId` | string | sim | `.trim().min(1)` |
| `equipmentId` | string | sim | `.trim().min(1)` |
| `thresholdKm` | number ≥ 0 | sim | valor na unidade indicada |
| `unit` | `'km' \| 'h'` | não | `.default('km')` |

Schema zod (`.strict()` mantido):

```ts
const EquipmentThresholdsRequestSchema = z
  .object({
    gearId: z.string().trim().min(1),
    equipmentId: z.string().trim().min(1),
    thresholdKm: z.number().min(0),
    unit: z.enum(['km', 'h']).default('km'),
  })
  .strict();
```

Respostas: `200 { equipmentThresholds }` · `400 { error: 'Invalid payload' }`
· `401` (sem sessão) · `405` com header `Allow`.

**`GET /api/app/equipment-thresholds`** — `200 { equipmentThresholds }` já normalizado.

**`GET /api/app/dashboard`** — inalterado; repassa `equipmentThresholds` normalizado
dentro do `DashboardResponse`.

## Integration Points

Sem integrações novas fora do código. Os limites de sistema já existentes e
inalterados: Upstash Redis (`src/services/redis.ts`), autenticação por cookie via
`withProtectedAPI` (`src/server/auth.ts`) e o agregador Strava que produz
`distance`/`movingTime` (`src/services/statistics.ts`). Não há novo dado
sensível, novo escopo de autorização nem política de retenção — a unidade é
preferência de exibição, não dado pessoal.

## Impact Analysis

| Componente | Tipo | Descrição e Risco | Ação necessária |
|---|---|---|---|
| `src/contracts/api.ts` | modificado | `EquipmentThresholds` muda de `number` para `ThresholdEntry`; risco de quebra de tipo em quem espera número | Adicionar `ThresholdUnit`/`ThresholdEntry`, ajustar request/response |
| `src/services/thresholds.ts` | modificado | Assinatura de `saveEquipmentThreshold` muda; normalização na leitura; **risco médio** — é o ponto único de dados | Normalizar legado, validar `unit`, gravar objeto |
| `src/pages/api/app/equipment-thresholds.ts` | modificado | Schema `.strict()` sem `unit` quebraria clientes antigos | Declarar `unit` com `.default('km')` |
| `src/utils/thresholds.ts` | modificado | Novo helper; `computeThresholdState` permanece intacto; risco baixo | Acrescentar `resolveCurrentConsumption` |
| `src/lib/apiClient.ts` | modificado | Payload ganha `unit`; risco baixo | Repassar a unidade do editor |
| `src/components/CardDetailModal.tsx` | modificado | Novo estado `unitInputs`, troca de unidade sem limpar o valor, JSX do seletor; **risco médio** — mais código de UI | Estado + seletor + `saveThreshold` com `unit` |
| `src/components/CardItem.tsx` | modificado | Cálculo por unidade, gate `distance !== 0`, `aria-hidden`; **risco médio** | Usar helper, condição de render, acessibilidade |
| `src/components/Stats.tsx` | modificado | `ThresholdAlertItem` ganha `unit` e `current`; gatilho filtrado por `limit > 0` | Recalcular com helper e propagar unidade |
| `src/components/ThresholdAlertModal.tsx` | modificado | Strings "km" fixas viram unidade do item; tipo duplicado | Formatar `48,0 h / 50,0 h` via `unit` |
| `src/components/ModalContainer.tsx` | modificado | Tipo inline do payload dessincronizado | Alinhar o tipo inline ao novo shape |
| `src/styles/components/CardDetailModal.module.css` | modificado | Encaixar seletor sem ganhar altura; `width: 12rem` fixo no input precisa ficar flexível | `.thresholdRow` flex + estilo do seletor |
| `src/styles/components/CardItem.module.css` | modificado | `.progressBar` permanece em 8px (o aumento para 16px existiu só durante o rótulo interno, removido); **atenção**: existe bloco legado de editor neste arquivo que o JSX não usa | Estilizar apenas `.progressBar`/`.progressFill` |
| `src/components/HowItWorksContent.tsx` | modificado | Textos "limite (em km)" (L131-197) ficam incorretos | Reescrever a seção de limites |
| `Readme.md` | modificado | Seção `## 🔔 Limites de Distância por Equipamento` (L262-281) | Atualizar formato e faixas |
| Testes (11 arquivos) | modificado/novo | Cobertura 99% statements exige teste de todo código novo | Ver Testing Approach |
| Seletor km\|h | **novo** | Primeiro `radio-group` do app — sem padrão a seguir | Definir padrão e cobrir teclado/foco |

## Testing Approach

### Unit Tests

- **`resolveCurrentConsumption`** — km usa `distance/1000`; h usa `movingTime/3600`;
  `distance`/`movingTime` ausentes caem em `0`; casos-limite `0` e valores fracionários.
- **Normalização de legado** — `getEquipmentThresholds` devolve `{ value: 120, unit: 'km' }`
  para `{"chain": 120}`, preserva `{ value: 50, unit: 'h' }`, devolve `{}` para chave ausente.
  Mock de Redis com `vi.doMock` + import dinâmico, padrão já usado em
  `tests/unit/services/thresholds.test.ts`.
- **`saveEquipmentThreshold`** — grava `{ value, unit }`; rejeita `unit` fora de `km`/`h`;
  mantém as validações atuais de `gearId`/`equipmentId`.
- **`computeThresholdState`** — inalterado; regressão dos casos existentes.
- **Editor (`CardDetailModal`)** — abrir pré-preenche valor **e** unidade salvos; trocar
  de unidade mantém o valor digitado; salvar envia `{ thresholdKm, unit }`; salvar `0` continua
  removendo o limite.
- **Seletor km\|h** — segmento correto vem pré-marcado; setas alternam; anel de foco
  visível; estado é anunciado (semântica de radio-group).
- **Barra (`CardItem`)** — largura calculada sobre horas quando `unit: 'h'`; a condição
  de render aceita `movingTime > 0` com `distance === 0`; `aria-valuetext` anuncia
  `48,0 h` sem desenhar texto na trilha.
- **`buildThresholdAlertItems` / gatilho do `Stats`** — limite em h dispara o modal;
  limite em km continua disparando; `limit <= 0` continua fora.

### Integration Tests

- **`tests/integration/equipment-thresholds.test.ts`** — POST sem `unit` grava km
  (regressão de cliente antigo); POST com `unit: 'h'` persiste e devolve a unidade;
  POST com `unit: 'minutos'` → `400`; GET devolve o shape normalizado; 401/405
  inalterados. Usa `createMockRequest`/`createMockResponse` e import dinâmico do handler.
- **`tests/integration/dashboard.test.ts`** — `equipmentThresholds` chega com
  `{ value, unit }`; o caso "skips if thresholds fail" continua verde.
- **`tests/unit/lib/apiClient.test.ts`** — payload inclui `unit`.
- **`tests/unit/config/index.test.ts`** — chave Redis inalterada (regressão).

Dados de teste: montar `Equipment` com `distance` e `movingTime` coerentes com a
unidade (ex.: `distance: 600000`, `movingTime: 180000`), e thresholds espelhados.
Sem dependência de ambiente além do `process.env.TZ = 'UTC'` do setup atual.

Gate de qualificação: `yarn validate` (lint → lint:colors → typecheck → test → build).
O `lint:colors` precisa aprovar as cores do seletor da unidade.

## Development Sequencing

### Build Order

1. **Tipos e contrato** — `ThresholdUnit`, `ThresholdEntry`, `EquipmentThresholds`,
   `EquipmentThresholdsRequest` em `src/contracts/api.ts`. *Sem dependências.*
2. **Regra pura** — `resolveCurrentConsumption` em `src/utils/thresholds.ts` + teste
   unitário. *Depende de 1.*
3. **Serviço** — normalização na leitura, `saveEquipmentThreshold` com `entry`,
   validação de `unit` + testes de serviço. *Depende de 1.*
4. **Endpoint** — `unit` no schema zod com `.default('km')` + testes de integração.
   *Depende de 3.*
5. **Cliente de API** — `saveEquipmentThreshold` envia `unit` + teste. *Depende de 1.*
6. **Tipos de alerta** — `ThresholdAlertItem` alinhado nos três lugares que o declaram
   (`Stats`, `ThresholdAlertModal`, `ModalContainer`). *Depende de 1.*
7. **`Stats.tsx`** — `buildThresholdAlertItems` com helper e `unit` + teste do gatilho.
   *Depende de 2, 6.*
8. **`ThresholdAlertModal.tsx`** — formatação `48,0 h / 50,0 h` + testes. *Depende de 6.*
9. **`CardItem.tsx`** — cálculo por unidade, gate de render,
   acessibilidade + testes. *Depende de 2.*
10. **Seletor km\|h + editor** — estado `unitInputs`, troca de unidade sem limpar o
    valor, `saveThreshold` com unidade + testes. *Depende de 4, 5, 9.*
11. **Estilos** — `.thresholdRow` com seletor sem ganhar altura; `.progressBar`
    permanece em 8px (sem rótulo interno). *Depende de 9, 10.*
12. **Textos de descoberta** — `HowItWorksContent.tsx` e `Readme.md`. *Depende de 10, 11.*
13. **Qualificação** — `yarn validate` completo e revisão do `lint:colors`.
    *Depende de todos os passos anteriores.*

### Technical Dependencies

- Nenhuma infraestrutura nova, nenhum serviço externo, nenhum entregável de terceiros.
- O único bloqueio de ambiente é `yarn lint:colors` aprovar as novas combinações de
  cor antes do passo 13.
- O cache em `sessionStorage` não exige migração: é regravado a cada resposta.

## Monitoring and Observability

- **Sem telemetria nova**, conforme decisão do PRD (MVP com verificação funcional).
  Não há métrica de adoção por unidade nem contador de limites criados.
- **Logs existentes continuam válidos:** `pino` no servidor. A falha de leitura de
  thresholds no dashboard já é registrada em `src/pages/api/dashboard.ts` com
  `'Failed to load equipment thresholds'` e não deve mudar de nível nem mensagem.
- **Eventos a observar apenas por log de erro:** validação de payload rejeitando `unit`
  inválida (`400`) e falha de escrita no Redis (exceção do serviço).
- **Sem alerting novo:** o app não tem pipeline de alerta operacional; o gate de
  regressão é o CI (`.github/workflows/ci-tests.yml`).

## Technical Considerations

### Key Decisions

- **Decisão:** modelo `{ value, unit }` com normalização na leitura.
  **Rationale:** entrega um shape único a todos os consumidores sem migrar dado.
  **Trade-offs:** lógica em toda leitura e tipo misto fora do serviço.
  **Rejeitado:** campo paralelo de unidades, string serializada, migração no Redis
  (detalhado em ADR-002).
- **Decisão:** `unit` opcional com `.default('km')` no zod `.strict()`.
  **Rationale:** preserva clientes com bundle cacheado (PWA/Capacitor).
  **Trade-offs:** contrato menos rígido; registro nasce km por convenção.
  **Rejeitado:** campo obrigatório, obrigatório com erro explícito.
- **Decisão:** helper puro compartilhado em `utils/thresholds.ts`.
  **Rationale:** uma fonte de verdade para alerta e barra; testável sem React.
  **Trade-offs:** uma camada de indireção a mais na leitura dos componentes.
  **Rejeitado:** conversão na composição via prop, conversão dentro de cada componente
  (detalhado em ADR-003).
- **Decisão:** `step` do input por unidade — `100` para km, `1` para h.
  **Rationale:** mantém o passo atual de km e evita `50,5h` onde o app exibe uma casa
  decimal; é detalhe de apresentação, não regra de negócio.
  **Trade-offs:** dois valores de `step` no mesmo campo.
  **Rejeitado:** `step` fixo de 100 (produziria limites de horas em múltiplos de 100).
- **Decisão:** suíte de teste completa, com o gatilho do alerta coberto renderizando `Stats`.
  **Rationale:** critério de sucesso do PRD exige o disparo coberto de ponta a ponta.
  **Trade-offs:** teste de componente mais lento que função pura.
  **Rejeitado:** gatilho só via função pura, ou cobertura mínima.

### Known Risks

- **A barra é `aria-hidden` (`CardItem.tsx:96`)** — a exigência de anunciar a unidade
  conflita com o atributo atual. *Mitigação:* retirar `aria-hidden` do contêiner e
  expor `role="progressbar"` com `aria-valuetext` formatado na unidade certa; coberto
  por teste de acessibilidade do componente.
- **A linha só renderiza com `equipmentDistance !== 0` (`CardItem.tsx:72`)** — limite em
  horas num componente sem distância jamais apareceria. *Mitigação:* a condição passa a
  aceitar também `movingTime > 0`; teste de caso-limite obrigatório.
- **Tipo `ThresholdAlertItem` triplicado** (`Stats.tsx:23`, `ThresholdAlertModal.tsx:6`,
  `ModalContainer.tsx:198`) — mudar um só dos três quebra o modal em runtime, não em
  compilação. *Mitigação:* passo 6 do build order trata os três juntos; TypeScript só
  pega divergência onde o tipo é anotado.
- **Cobertura de 99% statements** — qualquer linha nova sem teste derruba o CI.
  *Mitigação:* cada passo 2-10 traz seu teste junto, e `yarn test:coverage` roda antes
  do passo 13.
- **Bloco legado de editor em `CardItem.module.css:125-246`** que o JSX não usa —
  risco de estilizar o arquivo errado. *Mitigação:* alterar apenas as classes
  referenciadas pelo JSX atual (`CardDetailModal.module.css`).
- **Formato `48,0 h` exibido sobre um valor calculado em segundos** — arredondamento
  pode esconder pouco uso (ex.: 3 min vira `0,1 h`). *Mitigação:* aceito; o alerta usa a
  razão cheia, nunca o valor formatado.

## Architecture Decision Records

- [ADR-001: Limite por equipamento com unidade selecionável pelo usuário (km ou horas de pedalagem)](adrs/adr-001.md) — Um valor por limite com unidade escolhida pelo atleta; descarta limites simultâneos, sugestão por tipo e unidades livres.
- [ADR-002: Modelo persistido `{ value, unit }` com normalização retrocompatível na leitura](adrs/adr-002.md) — Normaliza registros numéricos legados em `getEquipmentThresholds` e aceita `unit` ausente como `km`; descarta campo paralelo, string serializada, `unit` obrigatório e migração no Redis.
- [ADR-003: Resolução do valor atual por helper puro compartilhado](adrs/adr-003.md) — `resolveCurrentConsumption` em `utils/thresholds.ts` como fonte única para alerta e barra; descarta conversão via prop e conversão dentro de cada componente.
