# Especificação Técnica: Limites de distância por equipamento com alerta visual

## Resumo Executivo

Esta especificação define a implementação técnica para salvar limites de distância por equipamento e avisar o usuário com uma modal independente quando algum equipamento em uma bike/gear específica ultrapassar o limite. A solução usa persistência no Redis para os limites do atleta e um novo endpoint de API para leitura e gravação. O trade-off principal é adicionar um ponto de persistência servidor-side em troca de uma experiência confiável entre sessões e dispositivos.

## Contexto

O PRD exige que o usuário configure limite de distância por equipamento em cada detalhe de bike/gear e que o app destaque riscos imediatamente ao abrir. O código atual carrega estatísticas do endpoint `/api/app/dashboard`, mantém cache em `sessionStorage`, e já usa Redis para autenticação, atividades e estatísticas.

## Escopo

### Escopo incluído

- Persistir limites por equipamento por atleta no Redis usando uma nova chave `strava:equipment-thresholds:<athleteId>`.
- Suportar limites por equipamento em cada `gearId` de bike/gear, não apenas por tipo de equipamento global.
- Expor o limite no dashboard quando o usuário abre o app.
- Criar um novo endpoint de API para salvar limites de equipamento.
- Adicionar um modal independente de alerta para equipamentos com limite ultrapassado.
- Atualizar o fluxo de detalhe do equipamento (`CardDetailModal`) para permitir edição do limite.

### Escopo fora

- Não alterar o processamento de atividades ou a lógica de estatísticas do Strava.
- Não enviar notificações fora da interface do app (email/SMS/push).
- Não criar uma página dedicada completa de gerenciamento de limites.
- Não inferir ou sugerir limites automaticamente.

## Arquitetura

A implementação é dividida entre:

- Backend Next.js API para persistência de limites no Redis.
- Front-end React para exibir progresso, editar limites e acionar o alerta.
- Integração com o endpoint de dashboard existente para carregar limites junto com `gearStats`.

### Componentes principais

- `src/config/index.ts`: estender `REDIS_KEYS` com `equipmentThresholds`.
- `src/pages/api/app/equipment-thresholds.ts`: novo endpoint GET/POST para limitação de equipamento.
- `src/contracts/api.ts`: estender `DashboardResponse` e adicionar tipos de request/response.
- `src/lib/apiClient.ts`: adicionar métodos para buscar e salvar limites.
- `src/components/CardDetailModal.tsx`: adicionar edição de limite por equipamento.
- `src/components/CardItem.tsx`: exibir barra de progresso e estado de risco.
- `src/components/ModalContainer.tsx`: suportar uma nova modal `threshold-alert` independente.
- `src/components/ThresholdAlertModal.tsx`: nova modal de alerta ao carregar o app.
- `src/components/Stats.tsx`: calcular se deve abrir a modal de alerta e enviar dados persistidos ao dashboard.

## Modelos de Dados

### Redis

Armazenar um JSON por atleta com limites por gear/equipment:

```ts
export type EquipmentThresholds = Record<
  string, // gearId
  Record<string, number> // equipmentId -> limite em km
>;
```

Chave Redis sugerida:

- `strava:equipment-thresholds:<athleteId>`

### API

Extender `DashboardResponse`:

```ts
type DashboardResponse = {
  athlete: DetailedAthlete;
  athleteStats: ActivityStats;
  hasGear: boolean;
  hasActivities: boolean;
  gearStats: GearStats[];
  equipmentThresholds: EquipmentThresholds;
};
```

Adicionar tipos:

```ts
export type EquipmentThresholdsRequest = {
  gearId: string;
  equipmentId: string;
  thresholdKm: number;
};

export type EquipmentThresholdsResponse = {
  equipmentThresholds: EquipmentThresholds;
};
```

## API e Persistência

### Leitura de limites

- O endpoint `/api/app/dashboard` deve incluir `equipmentThresholds` no payload atual.
- Isso mantém o dashboard como única chamada inicial necessária para mostrar limites e estatísticas.

### Gravação de limites

- Criar `/api/app/equipment-thresholds`:
  - `GET` retorna os limites atuais do atleta.
  - `POST` salva um limite específico para `gearId` + `equipmentId`.
- O endpoint deve usar `getAuthenticatedAthleteId(req)` e autenticação já existente do app.
- O payload de `POST` deve validar `thresholdKm` como número não negativo.

### Estrutura Redis

- Usar `redis.get` para ler o objeto completo na chave do atleta.
- Usar `redis.set` para gravar o objeto completo sempre que um limite for atualizado.
- Manter a gravação atômica no nível do objeto JSON; não é necessário lock distribuído para limites de configuração.

## Interfaces Principais

### Tipos de front-end

```ts
export type EquipmentThresholds = Record<string, Record<string, number>>;

export interface ThresholdSaveRequest {
  gearId: string;
  equipmentId: string;
  thresholdKm: number;
}
```

### React props para modal de detalhes

```ts
interface CardDetailModalProps {
  gearStat: GearStats;
  equipmentThresholds: EquipmentThresholds;
  onSaveThreshold: (
    gearId: string,
    equipmentId: string,
    thresholdKm: number,
  ) => Promise<void>;
  onClose: () => void;
}
```

### Exemplo de endpoint REST

```ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const athleteId = getAuthenticatedAthleteId(req);
  if (!athleteId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET':
      const current = await redis.get<EquipmentThresholds>(key);
      return res.status(200).json({ equipmentThresholds: current || {} });

    case 'POST':
      const { gearId, equipmentId, thresholdKm } =
        req.body as ThresholdSaveRequest;
      /* validar e persistir */
      return res.status(200).json({ equipmentThresholds: updated });

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end();
  }
}
```

## UI e Fluxo de Componentes

### `CardDetailModal`

- Adicionar seção de configuração de limite de distância para cada `CardItem`.
- Exibir o valor atual do limite e um botão/field para editar.
- Chamar `onSaveThreshold` ao salvar e exibir o novo estado imediatamente.

### `CardItem`

- Calcular progresso: `currentDistanceKm / thresholdKm`.
- Exibir uma barra de progresso compacta abaixo das informações existentes.
- Usar estados visuais:
  - normal: < 80%
  - aviso: 80–100%
  - atrasado: >= 100%
- Se não houver limite configurado, não precisa exibir nada.

### Alerta independente

- Criar `ThresholdAlertModal` como novo conteúdo de modal.
- Mostrar a lista de `gearId` + equipamentos com limites ultrapassados.
- Cada item deve exibir distância atual e limite configurado.
- A modal abre automaticamente ao iniciar `Stats` quando `dashboard.equipmentThresholds` indica pelo menos um equipamento atrasado.

### `ModalContainer`

- Adicionar novo case para `activeModal === 'threshold-alert'`.
- Reutilizar a camada de overlay/modal existente para acessibilidade.

## Estratégia de Testes

### Unitários

- Testar `CardItem` para:
  - exibir barra de progresso no caso de limite configurado;
  - aplicar classes de estado `normal`, `warning`, `overdue` corretamente;
  - exibir texto de limite ausente quando não há limite.
- Testar `CardDetailModal` para:
  - renderizar `equipmentThresholds` corretos;
  - chamar `onSaveThreshold` com os parâmetros esperados.
- Testar `ThresholdAlertModal` para:
  - listar apenas equipamentos com limite ultrapassado;
  - exibir distância atual e limite configurado.

### Integração de API

- Testar `pages/api/app/equipment-thresholds.ts` em cenários:
  - GET com atleta autenticado retorna dados válidos;
  - POST atualiza limite corretamente;
  - requisição sem auth retorna 401;
  - payload inválido retorna 400.

### Validação final

- Executar `yarn test` e confirmar que `Stats` carrega com `equipmentThresholds` sem falhas.
- Validar que o alerta de limite aparece ao abrir o app quando algum equipamento está atrasado.

## Sequência de Desenvolvimento

1. Atualizar `src/config/index.ts` para incluir `REDIS_KEYS.equipmentThresholds`.
2. Criar o endpoint `src/pages/api/app/equipment-thresholds.ts` com `GET` e `POST`. (Depende de 1)
3. Estender `src/contracts/api.ts` com os tipos de limites e atualizar `DashboardResponse`. (Depende de 2)
4. Atualizar `src/lib/apiClient.ts` com métodos `getEquipmentThresholds` e `saveEquipmentThreshold`. (Depende de 3)
5. Atualizar `src/pages/api/app/dashboard.ts` para incluir `equipmentThresholds` no payload. (Depende de 3)
6. Atualizar `src/components/Stats.tsx` para carregar thresholds e acionar a modal de alerta ao abrir. (Depende de 5)
7. Atualizar `src/components/CardDetailModal.tsx` e `src/components/CardItem.tsx` para exibir e editar limites. (Depende de 4 e 6)
8. Criar `src/components/ThresholdAlertModal.tsx` e atualizar `src/components/ModalContainer.tsx`. (Depende de 6)
9. Adicionar/atualizar testes unitários e de integração para API e UI. (Depende de 1-8)
10. Executar testes e validar o fluxo de alerta e edição.

## Riscos e Mitigações

- Risco: mudanças no esquema de `DashboardResponse` podem quebrar clientes que já usam o endpoint.
  - Mitigação: manter a deserialização existente e adicionar apenas o campo `equipmentThresholds` opcionalmente.
- Risco: a modal de alerta se torna intrusiva se for exibida em todas as aberturas.
  - Mitigação: mostrar apenas quando houver equipamentos com status `overdue` e permitir fechamento claro.
- Risco: atualizações de limite podem gerar inconsistência se a cache do `Stats` não for atualizada.
  - Mitigação: ao salvar um limite, atualizar o estado local e o `sessionStorage` relevante imediatamente.

## Registros de Decisão de Arquitetura

- `adr-001.md` — Configuração de limite de distância por equipamento com notificação visual.
- `adr-002.md` — Armazenar limites de equipamento no Redis e usar modal independente de alerta.
