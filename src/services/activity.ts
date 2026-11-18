import { getUnixTime } from 'date-fns';
import {
  DetailedActivity,
  DetailedAthlete,
  Strava,
  SummaryActivity,
  SummaryGear,
} from 'strava';
import { REDIS_KEYS } from '../config';
import redis from './redis';
import { saveRemote, updateActivityInArray, mergeActivities } from './utils';
import { getLogger } from './logger';
import { activityProcessed, activityFailed } from './metrics';
import {
  ActivitySportType,
  getActivitySportType,
  getStravaErrorDetails,
} from './strava-sdk';

export type ActivityBase = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  type: ActivitySportType | null;
  sport_type?: ActivitySportType | null;
  start_date_local: string;
  gear_id: string;
  private_note: string;
  /**
   * Época (s) da última leitura desta cópia no Strava — carimbo do fetch
   * (design 2026-11-18, item 2). No merge de cópias do mesmo id, vence a
   * mais nova; cópia gravada antes do deploy não tem o campo e vale 0
   * (é antiga de verdade), então nenhuma migração é necessária.
   */
  synced_at?: number;
};

/**
 * Lote máximo de detalhes (`getActivityById`) em voo dentro de `getActivities`.
 *
 * O Strava limita o app a 100 leituras por 15 min; cada rebuild puxa um
 * detalhe por atividade com `*` no título. Lotes de 8 mantêm o volume dentro
 * do quota sem degradar o resto do app (ver comentário no laço do fetch).
 */
const DETAIL_FETCH_CONCURRENCY = 8;

export interface StravaAuthData {
  lastUpdated: number;
  activities: ActivityBase[];
}

async function getActivities(
  strava: Strava,
  gears: SummaryGear[],
  before: number | null,
  after: number | null,
): Promise<ActivityBase[]> {
  let page = 1;
  const activities: SummaryActivity[] = [];
  let data: SummaryActivity[] = [];
  const activitiesPreparedToStore: ActivityBase[] = [];
  const gearIds = gears.map((gear) => gear.id);

  const queryParams: {
    before?: number;
    after?: number;
    per_page: number;
    page: number;
  } = {
    per_page: 200,
    page,
  };

  if (before) queryParams.before = before;
  if (after) queryParams.after = after;

  do {
    data = await strava.activities.getLoggedInAthleteActivities(queryParams);
    activities.push(...data);
    page++;
    queryParams.page = page;
  } while (data.length !== 0);

  const activitiesFilteredByActiveGear = activities.filter((activity) => {
    return activity.gear_id != null && gearIds.includes(activity.gear_id);
  });

  // Concorrência limitada dos detalhes: o `Promise.all` original disparava um
  // `getActivityById` **por atividade com `*` no título, todos ao mesmo tempo**
  // — num rebuild completo (1.212 atividades cacheadas, 201 com `*`) isso eram
  // 201 GETs paralelos contra o limite de leitura de 100 req/15min do Strava:
  // 429 garantido. Em lotes de 8, o mesmo volume cabe em várias janelas sem
  // estourar (e sem segurar o resto do app).
  for (
    let i = 0;
    i < activitiesFilteredByActiveGear.length;
    i += DETAIL_FETCH_CONCURRENCY
  ) {
    const batch = activitiesFilteredByActiveGear.slice(
      i,
      i + DETAIL_FETCH_CONCURRENCY,
    );
    await Promise.all(
      batch.map(async (activity) => {
        let private_note = '';
        let sportType = getActivitySportType(activity);
        const requiresDetailedSportType = !sportType || sportType === 'Ride';
        const requiresPrivateNote = activity.name.includes('*');
        const shouldFetchDetail = requiresPrivateNote; //|| requiresDetailedSportType;

        if (shouldFetchDetail) {
          try {
            const detail: DetailedActivity =
              await strava.activities.getActivityById({
                id: activity.id,
              });
            const detailedSportType = getActivitySportType(detail);
            if (detailedSportType) {
              sportType = detailedSportType;
            }
            if (requiresPrivateNote) {
              private_note = detail.private_note || '';
            }
          } catch (error) {
            const { status } = getStravaErrorDetails(error);
            if (status === 429) {
              // Rate limit não é falha de uma atividade isolada: aborta a
              // operação inteira para **não gravar** o cache sem as notas
              // privadas — os `*` são exatamente os markings de manutenção.
              // Seguir em frente aqui gravaria `private_note: ''` em silêncio
              // e perderia os códigos. A próxima tentativa refaz o fetch.
              getLogger().error(
                { err: error, activityId: activity.id },
                'Rate limit do Strava ao buscar detalhes — abortando o fetch',
              );
              throw error;
            }
            if (requiresPrivateNote) {
              // Qualquer erro no detalhe de uma atividade com `*` também
              // aborta — não só o 429. Uma nota perdida nunca é refeita
              // (o sync incremental busca só atividades novas; editar só a
              // nota no Strava não dispara webhook), então seguir em frente
              // aqui gravaria `private_note: ''` em silêncio e o marking
              // sumiria do card para sempre. Incidente de 2026-11-18:
              // 157/200 notas saíram vazias de um rebuild por erros
              // não-429 engolidos aqui. A próxima tentativa refaz o fetch.
              getLogger().error(
                { err: error, activityId: activity.id, status },
                'Falha ao buscar detalhes da atividade — abortando o fetch para não gravar nota vazia',
              );
              throw error;
            }
            // Enriquecer só o sport_type continua best-effort: não há dado
            // de manutenção em jogo e a atividade é reprocessada sem o
            // detalhe.
            getLogger().error(
              {
                err: error,
                activityId: activity.id,
                requiresPrivateNote,
                requiresDetailedSportType,
              },
              'Erro ao obter detalhes da atividade para enriquecer dados',
            );
          }
        }

        activitiesPreparedToStore.push({
          id: activity.id,
          name: activity.name,
          distance: activity.distance,
          moving_time: activity.moving_time,
          type: sportType,
          sport_type: sportType,
          start_date_local: activity.start_date_local,
          gear_id: activity.gear_id,
          private_note,
          // Carimbo do fetch: feito por atividade, logo após o detalhe — é o
          // "quando li esta cópia do Strava" usado pelo merge do recompute.
          synced_at: getUnixTime(Date.now()),
        });
      }),
    );
  }

  return activitiesPreparedToStore;
}

export async function fetchStravaActivity(
  activityId: number,
  strava: Strava,
): Promise<DetailedActivity> {
  try {
    const activity: DetailedActivity = await strava.activities.getActivityById({
      id: activityId,
    });

    if (activity == null) {
      throw new Error(`❌ Erro ao recuperar a atividade ${activityId}`);
    } else {
      return activity;
    }
  } catch (error) {
    getLogger().error({ err: error, activityId }, 'Falha ao buscar atividade');
    const { status, message } = getStravaErrorDetails(error);
    throw new Error(
      status
        ? `Strava API error: ${status} - ${message}`
        : `Strava API error: ${message}`,
    );
  }
}

// Lock curto de escrita da chave activities (design 2026-11-18, item 2):
// a seção crítica é reler→fn→gravar (ms), então o TTL de 30s cobre até um
// saveRemote lento com retries sem deixar lock órfão por tempo demais. A
// espera de 2s cobre a concorrência normal (webhook × recompute); passou
// disso, grava sem lock e degrada para o comportamento de antes do lock.
const ACTIVITIES_LOCK_TTL_SECONDS = 30;
const ACTIVITIES_LOCK_WAIT_MS = 2_000;
const ACTIVITIES_LOCK_POLL_MS = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A chave de auth do atleta ainda existe? Toda gravação de dados passa por
 * aqui antes de escrever (design 2026-11-18, item 4 — LGPD): um recompute
 * em andamento não pode ressuscitar `activities`/`statistics` de um atleta
 * cujo delete já rodou (o dado "revivido" persistiria para sempre — não há
 * próximo evento para limpá-lo).
 *
 * Falha de leitura → `true` (abre): hoje uma falha do Redis derrubaria a
 * gravação de qualquer jeito no passo seguinte, e o guard existe para
 * detectar delete, não para medir disponibilidade.
 */
async function athleteStillExists(athleteId: number): Promise<boolean> {
  try {
    const auth = await redis.get(REDIS_KEYS.auth(athleteId));
    return auth !== null && auth !== undefined;
  } catch (error) {
    getLogger().warn(
      { err: error, athleteId },
      'Falha ao verificar auth do atleta — seguindo como existente',
    );
    return true;
  }
}

/**
 * Serializa a leitura-modificação-gravação da chave `activities` por atleta
 * (design 2026-11-18, item 2): o recompute lê no início e grava no final —
 * sem esta seção crítica, qualquer `processActivity`/webhook do meio era
 * sobrescrito pelo snapshot antigo (lost update de nota/perfil).
 *
 * `fn` recebe o estado atual (relido **dentro** do lock) e devolve o array
 * a gravar via `processActivities`; devolver `null` pula a gravação (a
 * guarda LGPD detectou delete no meio). Retorna o resultado de `fn` ou
 * `null`. Fora do lock (teto de espera estourado), avisa e executa mesmo
 * assim — nunca pior do que antes do lock.
 */
async function withActivitiesWriteLock(
  athleteId: number,
  fn: (
    current: ActivityBase[],
  ) => ActivityBase[] | null | Promise<ActivityBase[] | null>,
): Promise<ActivityBase[] | null> {
  const log = getLogger();
  const lockKey = REDIS_KEYS.activitiesLock(athleteId);

  const tryAcquire = async (): Promise<boolean> => {
    try {
      return Boolean(
        await redis.set(lockKey, '1', {
          nx: true,
          ex: ACTIVITIES_LOCK_TTL_SECONDS,
        }),
      );
    } catch (error) {
      log.warn(
        { err: error, athleteId },
        'Falha ao adquirir lock de activities — tentando sem lock',
      );
      return false;
    }
  };

  let acquired = await tryAcquire();
  if (!acquired) {
    const start = Date.now();
    while (!acquired && Date.now() - start < ACTIVITIES_LOCK_WAIT_MS) {
      await sleep(ACTIVITIES_LOCK_POLL_MS);
      acquired = await tryAcquire();
    }
    if (!acquired) {
      log.warn(
        { athleteId, waitMs: ACTIVITIES_LOCK_WAIT_MS },
        'Lock de activities ocupado além do teto — gravando sem lock',
      );
    }
  }

  try {
    const stored = await redis.get<StravaAuthData>(
      REDIS_KEYS.activities(athleteId),
    );
    const current = Array.isArray(stored?.activities) ? stored.activities : [];

    if (!(await athleteStillExists(athleteId))) {
      log.info(
        { athleteId },
        'Gravação de activities cancelada — atleta sem auth (delete em andamento)',
      );
      return null;
    }

    const next = await fn(current);
    if (next === null) {
      return null;
    }

    await processActivities(athleteId, next);
    return next;
  } finally {
    if (acquired) {
      try {
        await redis.del(lockKey);
      } catch (error) {
        log.error(
          { err: error, athleteId },
          'Erro ao liberar lock de activities',
        );
      }
    }
  }
}

async function processActivity(
  activity: DetailedActivity,
  athleteId: number,
): Promise<ActivityBase[] | null> {
  try {
    // Update or insert the single activity — sob o lock de escrita: a
    // releitura dentro da seção crítica é o que impede o recompute de
    // sobrescrever esta escrita (e vice-versa).
    const updatedActivities = await withActivitiesWriteLock(
      athleteId,
      (current) => updateActivityInArray(activity, current),
    );

    if (updatedActivities) {
      try {
        activityProcessed.inc();
      } catch (_) {}
    }

    return updatedActivities;
  } catch (error) {
    getLogger().error(
      { err: error, activityId: activity.id },
      'Erro ao processar atividade',
    );
    try {
      activityFailed.inc();
    } catch (_) {}
    return null;
  }
}

async function processActivities(
  athleteId: number,
  updatedActivities: ActivityBase[],
) {
  const response = await saveRemote(
    REDIS_KEYS.activities(athleteId),
    JSON.stringify({
      lastUpdated: getUnixTime(Date.now()),
      activities: updatedActivities,
    }),
  );
  if (response.success) {
    getLogger().info({ athleteId }, `Atividades processadas para ${athleteId}`);
    try {
      activityProcessed.inc();
    } catch (_) {}
  } else {
    throw new Error(`Erro ao processar atividades para ${athleteId}`);
  }
}

async function verifyIfHasAnyActivities(
  strava: Strava,
  athlete: DetailedAthlete,
): Promise<boolean> {
  try {
    // Cache baseline: quando o cache de atividades já existe e tem itens,
    // respondemos 100% do Redis — mais uma chamada Strava a menos por poll do
    // dashboard (limite de leitura é 100 req/15min por aplicativo).
    //
    // O fallback para a API fica nos dois casos em que o cache não prova nada:
    // chave ausente (primeira sincronização, quando o cache ainda não existe)
    // e chave vazia (sem atividades com gear — o endpoint antigo continuaria
    // listando atividades de qualquer tipo). Sem esse fallback, um usuário
    // novo nunca aqueceria o cache e o painel ficaria vazio para sempre.
    if (typeof athlete?.id === 'number') {
      try {
        const stored = await redis.get<StravaAuthData>(
          REDIS_KEYS.activities(athlete.id),
        );
        if (stored?.activities && stored.activities.length > 0) {
          return true;
        }
      } catch (cacheError) {
        // Best-effort: erro de cache não pode falhar o dashboard — o caminho
        // abaixo (API do Strava) responde igual ao de antes desta otimização.
        getLogger().warn(
          { err: cacheError, athleteId: athlete.id },
          'Falha ao ler cache de atividades — seguindo para a API do Strava',
        );
      }
    }

    const response = await strava.activities.getLoggedInAthleteActivities();
    return response !== null && response !== undefined && response.length !== 0;
  } catch (error) {
    getLogger().error(
      { err: error },
      'Falha ao verificar existência de atividades',
    );
    try {
      activityFailed.inc();
    } catch (_) {}
    throw error;
  }
}

export {
  getActivities,
  processActivities,
  processActivity,
  verifyIfHasAnyActivities,
  withActivitiesWriteLock,
  athleteStillExists,
};
