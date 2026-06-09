# TechSpec: Sincronização Automática da UI (Atualização Automática)

Esta especificação descreve a implementação de um mecanismo de sincronização em tempo real (baseado em polling) para o dashboard do GearLife. O objetivo é garantir que os dados permaneçam atualizados sem a necessidade de refresh manual, especialmente após o processamento de atividades do Strava por webhooks de segundo plano.

## Contexto Técnico

Atualmente, o GearLife realiza uma única busca de dados durante a montagem do componente `Stats`. Se um webhook atualizar as estatísticas do usuário no Redis enquanto o app estiver aberto, o usuário não verá as mudanças até recarregar a página. Para melhorar a percepção de "instantaneidade", implementaremos uma estratégia de polling silencioso usando a biblioteca SWR.

## Arquitetura do Sistema

A solução envolve um hook de sincronização no lado do cliente que consulta periodicamente a API de dashboard existente.

- **Frontend:** Next.js com a biblioteca `swr`.
- **Backend:** Endpoint existente `/api/app/dashboard`.
- **Gerenciamento de Estado:** `AuthContext` (para informações do atleta) e estado local do `Stats.tsx` (para estatísticas dos equipamentos).

## Modelos de Dados e Armazenamento

Não são necessários novos esquemas de banco de dados. Reutilizaremos as chaves Redis existentes:
- `strava:statistics:<athleteId>`
- `strava:activities:<athleteId>`

Utilizaremos o timestamp `lastUpdated` já presente nesses registros para decidir quando uma atualização completa da UI é estritamente necessária, embora a implementação inicial fará o polling completo do dashboard para simplicidade e feedback instantâneo.

## Design da API

Continuaremos utilizando:
- `GET /api/app/dashboard`: Retorna o estado completo (atleta, estatísticas, equipamentos, limites).

Otimização Opcional:
- `GET /api/app/sync-status`: Um endpoint leve que retorna apenas o timestamp `lastUpdated` do atleta.

## Experiência do Usuário

- **Atualização Silenciosa:** Os dados são atualizados no local. Sem spinners de carregamento ou saltos de layout.
- **Alertas Automáticos:** Se os novos dados resultarem em um equipamento com manutenção atrasada, o `ThresholdAlertModal` é disparado automaticamente.
- **Modo Econômico:** O polling para quando a aba está oculta (configuração `revalidateOnVisibilityConf` do SWR).

## Interfaces Principais

### Hook useAutoSync

Um novo hook para encapsular a lógica de polling.

```typescript
// src/hooks/useAutoSync.ts
import useSWR from 'swr';
import { apiClient } from '../lib/apiClient';

export function useAutoSync(intervalMs = 5000) {
  const { data, error, mutate } = useSWR('dashboard', apiClient.getDashboard, {
    refreshInterval: intervalMs,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  return {
    dashboard: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
```

## Estratégia de Testes

- **Testes Unitários:** Verificar se o `useAutoSync` chama a API nos intervalos corretos e lida com mudanças de visibilidade.
- **Testes de Integração:** Simular a API de dashboard retornando valores atualizados e validar se o `Stats.tsx` reflete a nova distância/tempo e dispara o modal de alerta.
- **QA Manual:** Simular um evento de webhook e observar a atualização da UI em até 5 segundos sem interação.

## Sequenciamento de Desenvolvimento

1. **Setup:** Instalar a dependência `swr`.
2. **Implementação do Hook:** Criar `src/hooks/useAutoSync.ts`.
3. **Refatoração do Stats.tsx:**
   - Substituir a lógica manual de busca no `useEffect` pelo `useAutoSync`.
   - Garantir que o `sessionStorage` e o `AuthContext` sejam sincronizados a cada resposta bem-sucedida.
   - Reintegrar a lógica `openThresholdAlert` para rodar sempre que os dados do SWR mudarem.
4. **Otimização:** Implementar verificações de Page Visibility para pausar o polling.
5. **Verificação:** Executar as suítes de testes existentes e novas.

## Registros de Decisão de Arquitetura (ADRs)

- [ADR 001: Implementação de Atualização Automática da UI via Polling Inteligente](./adrs/adr-001.md) — Decisão pelo Polling de 5s usando SWR para uma experiência de tempo real com custo zero de infraestrutura extra.

## Questões em Aberto

- Devemos reduzir a frequência do polling se o usuário estiver inativo (sem movimento de mouse/teclado) por mais de 10 minutos?
- O endpoint `/api/app/dashboard` atual é rápido o suficiente (<200ms) para ser chamado a cada 5s sem impactar significativamente os limites de execução da Vercel?
