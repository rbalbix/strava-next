import useSWR from 'swr';
import { apiClient } from '../lib/apiClient';

/**
 * Intervalo do polling em estado saudável.
 *
 * Cada `/api/app/dashboard` faz ≥3 chamadas à API do Strava (`getAthlete`,
 * `getAthleteStats` e `verifyIfHasAnyActivities` — `src/pages/api/dashboard.ts:39-42`),
 * e `updateStatistics` acrescenta mais uma quando o cache de estatísticas está
 * frio. Com o intervalo anterior de 5s isso dava 36 chamadas/minuto, ou ~540
 * por janela de 15 minutos, contra o limite de 300 da API do Strava: **uma
 * única aba aberta estourava o quota sozinha em menos de 8 minutos** — e era
 * o gatilho real do rate-limit descrito no plano de usabilidade (A3).
 *
 * Em 60s o polling consome ~45 chamadas por 15 minutos (≈15% do quota),
 * deixando espaço para as próprias ações do usuário. A frescura praticamente
 * não sofre: `revalidateOnFocus` refaz a leitura assim que a volta a aba, e o
 * painel de erro do `Stats` oferece retry manual.
 */
const BASE_INTERVAL_MS = 60_000;

/**
 * Base do backoff exponencial do SWR quando uma leitura falha.
 *
 * O SWR já cresce o intervalo sozinho (≈5s, 10–25s, 20–60s, 40–120s,
 * 80–240s, com jitter), cobrindo a progressão 5s → 2min prevista no plano.
 * O que faltava era o teto: sem `errorRetryCount` as tentativas são
 * infinitas.
 *
 * Detalhe que só aparece lendo a fonte do SWR (`swr/dist/index/index.mjs:610`):
 * enquanto houver erro no cache o **polling fica suspenso** — `execute()` só
 * revalida se `!getCache().error`. Ou seja, o `refreshInterval` não é o que
 * protege contra rate-limit em falha; a fila de retries é. Por isso o backoff
 * é declarado aqui e não no intervalo do polling.
 */
const ERROR_RETRY_INTERVAL_MS = 5_000;

/**
 * Teto de tentativas automáticas após uma falha (1 inicial + 5 retries).
 *
 * Sem isto, uma falha persistente — ex.: rate limit do Strava — geraria uma
 * fila de retries que nunca termina, mantendo o app preso a um endpoint que
 * não vai voltar. Com o teto, a recuperação fica por conta de três caminhos
 * explícitos: retry manual no painel de erro, retorno de foco à aba e
 * reconexão de rede.
 */
const ERROR_RETRY_COUNT = 5;

/**
 * Hook to automatically synchronize dashboard data using polling.
 *
 * @param intervalMs Intervalo de polling em milissegundos. Padrão: 60000ms.
 * @returns Dashboard data, loading state, error state, and mutate function.
 */
export function useAutoSync(intervalMs = BASE_INTERVAL_MS) {
  const { data, error, mutate, isLoading } = useSWR(
    'dashboard',
    apiClient.getDashboard,
    {
      refreshInterval: intervalMs,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: true,
      errorRetryInterval: ERROR_RETRY_INTERVAL_MS,
      errorRetryCount: ERROR_RETRY_COUNT,
    },
  );

  return {
    dashboard: data,
    isLoading,
    isError: error,
    mutate,
  };
}
