import { DetailedAthlete, Strava } from 'strava';
import { REDIS_KEYS } from '../config';
import { getLogger } from './logger';
import redis from './redis';

/**
 * TTL do cache baseline do dashboard (60s).
 *
 * Cada `/api/app/dashboard` custava 3 chamadas da API do Strava (`getAthlete`,
 * `getAthleteStats` e `verifyIfHasAnyActivities`). Com o limite de leitura de
 * 100 req/15min **por aplicativo**, só a aba aberta já consumia ~45 chamadas
 * por janela — 45% do quota. Com o cache, o poll quente zera essas chamadas
 * (60s de staleness é aceitável: nome/bike do atleta raramente muda e o
 * `verifyIfHasAnyActivities` continua vivo via webhook).
 *
 * Falha de cache nunca derruba a chamada: leitura/escrita são best-effort e
 * caem de volta na API do Strava.
 */
const BASELINE_CACHE_TTL_SECONDS = 60;

type AthleteStats = Awaited<ReturnType<Strava['athletes']['getStats']>>;

function isAthleteLike(value: unknown): value is DetailedAthlete {
  return (
    typeof value === 'object' && value !== null &&
    typeof (value as { id?: unknown }).id === 'number'
  );
}

async function getAthlete(
  strava: Strava,
  athleteId?: number,
): Promise<DetailedAthlete> {
  if (athleteId !== undefined) {
    try {
      const cached = await redis.get<DetailedAthlete>(
        REDIS_KEYS.athleteCache(athleteId),
      );
      if (isAthleteLike(cached)) return cached;
    } catch (error) {
      getLogger().warn(
        { err: error, athleteId },
        'Falha ao ler cache do atleta — seguindo para a API do Strava',
      );
    }
  }

  const athlete = await strava.athletes.getLoggedInAthlete();

  if (athleteId !== undefined) {
    try {
      await redis.set(REDIS_KEYS.athleteCache(athleteId), athlete, {
        ex: BASELINE_CACHE_TTL_SECONDS,
      });
    } catch (error) {
      getLogger().warn(
        { err: error, athleteId },
        'Falha ao gravar cache do atleta',
      );
    }
  }

  return athlete;
}

async function getAthleteStats(
  strava: Strava,
  athlete: DetailedAthlete,
): Promise<AthleteStats> {
  try {
    const cached = await redis.get<AthleteStats>(
      REDIS_KEYS.athleteStatsCache(athlete.id),
    );
    if (typeof cached === 'object' && cached !== null) return cached;
  } catch (error) {
    getLogger().warn(
      { err: error, athleteId: athlete.id },
      'Falha ao ler cache de estatísticas do atleta — seguindo para a API do Strava',
    );
  }

  const stats = await strava.athletes.getStats({ id: athlete.id });

  try {
    await redis.set(REDIS_KEYS.athleteStatsCache(athlete.id), stats, {
      ex: BASELINE_CACHE_TTL_SECONDS,
    });
  } catch (error) {
    getLogger().warn(
      { err: error, athleteId: athlete.id },
      'Falha ao gravar cache de estatísticas do atleta',
    );
  }

  return stats;
}

export { getAthlete, getAthleteStats, BASELINE_CACHE_TTL_SECONDS };
