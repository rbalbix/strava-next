/**
 * Janela de rate limit de leitura do Strava (15 min, reset às :00, :15, :30
 * e :45 — https://developers.strava.com/docs/rate-limits).
 *
 * O app é limitado **por aplicativo**: 100 leituras/15min e 1.000/dia no tier
 * padrão. Enquanto a janela não vira, todo request da API responde 429 — por
 * isso devolvemos ao cliente quanto falta para o reset, em vez de fazer ele
 * tentar de novo às cegas.
 */
const STRAVA_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Segundos até o fim da janela de rate limit corrente do Strava.
 *
 * `now` é epoch em milissegundos (padrão: agora). O mínimo de 1s cobre o
 * arredondamento; a janela seguinte é o próximo quarto de hora estrito.
 */
export function secondsToNextStravaWindow(
  now: number = Date.now(),
): number {
  let next =
    Math.ceil(now / STRAVA_RATE_LIMIT_WINDOW_MS) * STRAVA_RATE_LIMIT_WINDOW_MS;
  // Exato na virada: a janela atual acabou de começar (reset já ocorreu) →
  // conta a próxima de 15 min, não 0.
  if (next === now) next += STRAVA_RATE_LIMIT_WINDOW_MS;
  return Math.max(1, Math.round((next - now) / 1000));
}

export { STRAVA_RATE_LIMIT_WINDOW_MS };
