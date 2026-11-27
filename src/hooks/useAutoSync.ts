import useSWR, { useSWRConfig } from 'swr';
import { apiClient, getHttpStatus } from '../lib/apiClient';

/** Chave do SWR compartilhada entre o hook e a leitura do cache abaixo. */
const DASHBOARD_KEY = 'dashboard';

/**
 * Intervalo do polling em estado saudável.
 *
 * Cada `/api/app/dashboard` faz ≥3 chamadas à API do Strava (`getAthlete`,
 * `getAthleteStats` e `verifyIfHasAnyActivities` — `src/pages/api/dashboard.ts:40-43`),
 * e `updateStatistics` acrescenta mais duas quando o cache de estatísticas está
 * frio. Com o intervalo anterior de 5s isso dava 36 chamadas/minuto, ou ~540
 * por janela de 15 minutos, contra o limite de **100 leituras/15min por
 * aplicativo** do Strava (tier padrão — ver
 * https://developers.strava.com/docs/rate-limits): **uma única aba aberta
 * estourava o quota sozinha em menos de 3 minutos** — e era o gatilho real do
 * rate-limit descrito no plano de usabilidade (A3).
 *
 * Em 60s o polling consome ~45 chamadas por janela de 100 (≈45% do quota de
 * leitura) no pior caso; com o cache baseline de 60s em `getAthlete`,
 * `getAthleteStats` e `verifyIfHasAnyActivities` o poll quente custa **0**
 * chamadas Strava. A frescura praticamente não sofre: `revalidateOnFocus`
 * refaz a leitura assim que a volta a aba, e o painel de erro do `Stats`
 * oferece retry manual.
 *
 * Obs.: o orçamento é do **aplicativo**, compartilhado por todos os atletas
 * (e por cada `next dev`/aba aberta) — não por usuário.
 */
const BASE_INTERVAL_MS = 60_000;

/**
 * Detecta o rate limit do Strava a partir de qualquer erro do fetcher.
 *
 * A rota `/api/app/dashboard` devolve `429` com `Retry-After` quando a
 * janela de leitura esgota; `ApiError` carrega o status real.
 */
function isRateLimitError(error: unknown): boolean {
  return getHttpStatus(error) === 429;
}

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
 * Sem isto, uma falha persistente geraria uma fila de retries que nunca
 * termina, mantendo o app preso a um endpoint que não vai voltar. Com o teto,
 * a recuperação fica por conta de três caminhos explícitos: retry manual no
 * painel de erro, retorno de foco à aba e reconexão de rede.
 */
const ERROR_RETRY_COUNT = 5;

/**
 * Hook to automatically synchronize dashboard data using polling.
 *
 * Em 429 (rate limit do Strava) o comportamento é deliberadamente mais
 * conservador que em qualquer outra falha:
 * - **sem retry automático** (`shouldRetryOnError` recusa) — cada retry
 *   consome mais quota e adia o reset da janela;
 * - **sem revalidação ao focar a aba** — antes, trocar de aba já bastava para
 *   reacender o loop de 429;
 * - **polling zerado** enquanto durar o 429.
 * A recuperação é manual (retry no painel de erro) ou automática assim que a
 * janela de 15 min do Strava vira (a rota devolve `retryAfterSeconds`).
 *
 * @param intervalMs Intervalo de polling em milissegundos. Padrão: 60000ms.
 * @returns Dashboard data, loading state, error state, and mutate function.
 */
export function useAutoSync(intervalMs = BASE_INTERVAL_MS) {
  // rateLimited é DERIVADO do erro no cache do SWR (P3) — antes era
  // useState espelho alimentado por onError/onSuccess: estado guardado em
  // estado podia divergir do erro real e custava um render extra. O cache é
  // lido ANTES do useSWR porque as opções abaixo precisam do valor já neste
  // render; o próprio SWR re-renderiza o hook quando o erro muda, então a
  // leitura fica sempre fresca.
  const { cache } = useSWRConfig();
  const rateLimited = isRateLimitError(cache.get(DASHBOARD_KEY)?.error);

  const { data, error, mutate, isLoading } = useSWR(
    DASHBOARD_KEY,
    apiClient.getDashboard,
    {
      refreshInterval: rateLimited ? 0 : intervalMs,
      revalidateOnFocus: !rateLimited,
      revalidateOnReconnect: true,
      shouldRetryOnError: (err: Error) => !isRateLimitError(err),
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
