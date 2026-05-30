# GearLife — Glossário do Domínio

## Entidades Principais

### Athlete (Atleta)

A pessoa que usa o GearLife. Equivalente ao "user" no contexto do app. Identificado por um `athleteId` do Strava. Cada atleta tem:

- **tokens de acesso**: renovados quando expiram (via OAuth e Strava API)
- **bicicletas**: cada bicicleta tem um `gearId` no Strava
- **histórico de atividades**: importado do Strava

**Termos relacionados:**

- "User" = Athlete (sinônimos neste projeto)

---

### Activity (Atividade)

Um passeio ou treino gravado e enviado para o Strava. Sempre tem:

- **tipo de esporte** (`ActivitySportType`): mountain_bike, road, gravel, etc.
- **distância em km**
- **tempo em movimento**
- **data**
- **nome/descrição** (fornecido pelo atleta)
- **nota privada** (optional; usada para marcar componentes que foram mantidos/substituídos)

Uma atividade é processada pelo webhook do Strava → mapeia desgaste de componentes → atualiza estatísticas.

---

### Equipment (Equipamento / Peça)

Um componente físico de uma bicicleta que sofre desgaste e requer manutenção. Exemplos:

- **Consumíveis**: chain (corrente), tires (pneus), tubes (câmaras), lubrification (lubrificação)
- **Serviços**: review (revisão completa), clean (lavagem), suspension review (revisão de suspensão)
- **Partes**: stem (avanço), handlebar (guidão), wheelset (rodas), suspension, shock

Cada equipamento tem:

- **id único** no banco de dados: `'chain'`, `'tires'`, `'lub'`, etc.
- **caption**: rótulo para a nota privada da atividade (e.g., `"lubrificação:"`)
- **show**: nome amigável para o UI (e.g., `"Lubrificação"`)

**Nota importante**: "Equipamento" é também sinônimo de "Gear" em contexto do Strava (bicicleta), mas em GearLife **Equipamento** refere-se ao componente rastreável.

---

### Gear (Bicicleta no Strava)

A bicicleta em si, do ponto de vista da API do Strava. Cada atleta pode ter múltiplas gears.
Cada `Gear` tem um `gearId` e um `distance` total (km rodados).

**Relacionamento:**

- Uma `Activity` pertence a exatamente um `Gear`
- Um `Gear` tem múltiplos `Equipments` instalados
- Cada `Equipment` acumula distância/tempo via atividades do `Gear`

---

### Statistics (Estatísticas)

Cálculos do desgaste e manutenção de todos os equipamentos de um atleta. Resultado de:

- **Histório de atividades** processadas
- **Equipamentos associados** a cada bicicleta
- **Eventos de manutenção** registrados na nota privada das atividades

Uma estatística por equipamento inclui:

- **distância acumulada** (km)
- **tempo em movimento acumulado** (minutos)
- **data da última manutenção**
- **próxima data de manutenção sugerida** (com base em limites configuráveis)

---

### Maintenance Event (Evento de Manutenção)

Uma ação registrada pelo atleta na nota privada de uma atividade para marcar que ele:

- **Substituiu** um equipamento
- **Realizou limpeza, lubrificação ou revisão**

A nota privada usa um padrão: `"equipment_id"` (e.g., `"chain,lub"` = corrente substituída, lubrificação feita).

Ao processar a atividade, o sistema:

1. Detecta equipamentos mencionados
2. Reseta o contador de desgaste daquele equipamento
3. Registra a data da manutenção

---

### Webhook (Evento do Strava)

Notificações em tempo real do Strava sobre eventos de um atleta. Tipos principais:

- **`activity` (`create` / `update`)**: Uma nova atividade foi criada ou modificada
- **`athlete` (`delete`)**: O atleta pediu para deletar seus dados (GDPR/LGPD compliance)

Cada webhook:

1. Valida a assinatura (`VERIFY_TOKEN`)
2. Deduplica via Redis (TTL de 2h) para evitar reprocessamento
3. Executa a lógica apropriada (atualizar estatísticas, deletar dados, etc.)
4. Registra erros e notifica por email em caso de falha

---

## Conceitos Técnicos Críticos

### Token Refresh com Lock Distribuído

Quando o token de acesso do Strava expira, o sistema:

1. Adquire um lock distribuído no Redis: `strava:lock:refresh:<athleteId>` (SET NX)
2. Verifica se outro processo não fez refresh enquanto aguardava o lock
3. Executa o refresh na API do Strava
4. Persiste o novo token com `setex` (TTL de 90 dias)
5. Libera o lock

**Por quê?** Evitar _cache stampede_: múltiplas requisições do mesmo atleta chegando simultaneamente, todas tentando refazer o token.

---

### Idempotência de Webhooks

Cada evento de webhook é rastreado no Redis com uma chave temporária:

- **Chave**: baseada em `athleteId`, `objectId`, `aspectType`, `eventTime`
- **TTL**: 2 horas
- **Ação**: Se a chave já existe, ignora o evento

**Por quê?** O Strava pode reenviar o mesmo evento múltiplas vezes (rede instável, retry policies).

---

### Redis Server-Only

Todo acesso ao Redis ocorre exclusivamente no backend:

- ✅ `src/services/redis.ts`
- ✅ `src/pages/api/*` (rotas de API)
- ❌ Nunca em componentes React client-side
- ❌ Nunca em `src/pages/*` renderizadas no navegador

**Por quê?** Segurança: tokens, sessions e dados sensíveis são armazenados lá.

---

## Fluxo Principal: Do Strava ao GearLife

```
1. Atleta faz uma atividade no Strava
2. Estrava envia webhook → POST /api/webhook
3. GearLife valida assinatura + deduplica
4. GearLife busca o token do atleta (refresh se necessário, com lock)
5. GearLife cria cliente Strava e busca detalhes da atividade
6. Analisa a nota privada → detecta equipamentos mencionados
7. Atualiza estatísticas (distância, tempo, data de manutenção)
8. Persiste estatísticas no Redis
9. Se houver erro → envia email para o atleta
10. Se atleta deletou sua conta → apaga todos os dados do Redis
```

---

## Decisões de Domínio ✅

### Ciclo de Vida de Equipamento

**Decisão: A — Infinito com Resets**

Um equipamento nunca "esgota" permanentemente. O padrão é:

1. Atleta instala o equipamento → contador de desgaste = 0
2. Acumula distância/tempo com as atividades
3. Quando substitui ou faz manutenção → nota privada marca (ex: `"chain"`)
4. Webhook reseta o contador para 0
5. Ciclo recomeça infinitamente

Não há limite máximo de trocas ou ciclos. A sequência é infinita.

---

## Decisões de Domínio Adicionais ✅

### Manutenção (Maintenance)

**Decisão: A — Resets independentes por marcação**

Quando a nota privada de uma atividade contém múltiplas marcações (ex: `"chain,review,lub"`), cada marcação:

- Reseta apenas o contador do `Equipment` correspondente.
- Registra a data da manutenção daquele `Equipment`.

Exemplo: `"chain,review,lub"` resulta em:

- `chain` → contador = 0, última manutenção = data
- `review` → contador = 0, última manutenção = data
- `lub` → contador = 0, última manutenção = data

Não há regras automáticas de dependência entre marcações por esta decisão (ex: `review` NÃO reseta `lub` automaticamente), a menos que a equipe especifique relações explícitas no código (ver `src/services/statistics.ts`).

---

## Termos Ambíguos / Pendentes de Clarificação

- **"Gear"**: Em Strava = bicicleta. Em GearLife = "Equipamento" geralmente. Qual é a convenção preferida?
- **Outras dúvidas**: regras de dependência entre marcações (se necessário) devem ser formalizadas via ADR.

---

## Glossário Expandido — Termos e Artefatos

### Lista de Equipamentos (ids)

Extraído de `src/services/equipment.ts`. Agrupado por tipo (consumíveis, serviços, partes):

- Consumíveis: `lub`, `chain`, `tubes`, `tubeless`, `tires`, `fronttube`, `reartube`
- Serviços: `review`, `clean`, `suspareview`, `shockreview`
- Partes / Componentes: `stem`, `handlebar`, `wheelset`, `frontwheel`, `rearwheel`, `brakes`, `frontbrake`, `rearbrake`, `disks`, `frontdisk`, `reardisk`, `calipers`, `levers`, `stis`, `tape`, `grip`, `dropper`, `saddle`, `pedal`, `chain`, `bb`, `cassette`, `crankset`, `rearderailleur`, `pulley`, `rearshifter`, `helmet`, `shoes`, `freehub`

### Formato de Nota Privada

- Atividades sinalizadas: qualquer atividade cujo `name` contenha `*` é inspecionada.
- Marcações: busca por substring do `equipment.id` (ex.: `"chain,lub"`).
- A palavra `review` é tratada como palavra isolada com regex `/\breview\b/`.

### Semântica de Manutenção

- Quando detectado um `equipment.id` em uma atividade sinalizada, o sistema registra um evento de manutenção com:
  - `equipment.distance` = distância acumulada até o ponto da atividade
  - `equipment.movingTime` = tempo acumulado até a atividade
  - `equipment.date` = `start_date_local` da atividade
- Esse registro permite calcular a distância/tempo desde a última manutenção.

### Regras Especiais (dependências codificadas)

- `tubeless` marca `tubes`, `fronttube`, `reartube` como registrados (ignora câmaras).
- `brakes` marca `frontbrake`/`rearbrake` como registrados (par de pastilhas).
- `suspension` / `shock` marcam `suspareview`/`suspakit` e `shockreview`/`shockkit` como registrados conforme o caso.

### Chaves Redis Principais (`REDIS_KEYS`)

- `strava:auth:<athleteId>` — tokens e auth do atleta
- `strava:activities:<athleteId>` — cache de atividades + `lastUpdated`
- `strava:statistics:<athleteId>` — estatísticas processadas
- `strava:lock:refresh:<athleteId>` — lock distribuído para refresh de token

### Idempotência e Rate-limiting de Webhooks

- Replay key: `strava:webhook:seen:<owner_id>:<object_type>:<object_id>:<aspect_type>:<event_time>` (TTL 2h).
- Rate key: `strava:webhook:rate:<athleteId>:<ip>:<window>` (janela por minuto).

### Fluxo de OAuth e Refresh de Token

- `getAthleteAccessToken()` lê `strava:auth`, verifica `expiresAt` e — se expirado — tenta `refreshStravaToken()` com lock `strava:lock:refresh:<athleteId>`.
- Refresh usa retry/backoff e tem fallback caso outro processo trave (ver `src/services/strava-auth.ts`).

### Métricas (Prometheus-like)

- Métricas principais: `webhook_events_total`, `webhook_validation_failed_total`, `token_refresh_attempts_total`, `token_refresh_success_total`, `token_refresh_failure_total`, `activity_processed_total`, `activity_failed_total`, `email_sent_total`, `email_failed_total`.
- Métricas persistidas em Redis como `metrics:counter:<metricName>` para agregação entre instâncias.

### Endpoints e Rotas Internas Relevantes

- `API_ROUTES` (em `src/config/index.ts`): `/api/authorize`, `/api/remoteStorage`, `/api/save-tokens`, `/api/send-email`.
- Métricas: `GET /api/metrics` (requere `X-Internal-Api-Key`).

### Regras de Ingestão de Atividades

- Atividades com `*` no `name` disparam fetch detalhado (`getActivityById`) para recuperar `private_note` e sport type.
- Atividades são ordenadas por `gear_id` e `start_date_local` para cálculo cumulativo correto (ver `createStatistics`).

### Variáveis de Ambiente Críticas

- `CLIENT_ID`, `CLIENT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `VERIFY_TOKEN`, `WEBHOOK_SUBSCRIPTION_ID`, `RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `INTERNAL_API_TOKEN`, `NEXT_PUBLIC_APP_URL` (veja `Readme.md`).

---

Se quiser, posso: (1) inserir a lista completa formatada dos `Equipments` diretamente no `CONTEXT.md`; (2) transformar as "Regras Especiais" em um ADR; ou (3) criar testes unitários cobrindo marcações como `"chain,lub"`.
