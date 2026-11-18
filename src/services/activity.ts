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

async function processActivity(
  activity: DetailedActivity,
  athleteId: number,
): Promise<ActivityBase[] | null> {
  try {
    const stored = await redis.get<StravaAuthData>(
      REDIS_KEYS.activities(athleteId),
    );
    const activities = stored?.activities || [];

    // Update or insert the single activity
    const updatedActivities = updateActivityInArray(activity, activities);
    await processActivities(athleteId, updatedActivities);

    try {
      activityProcessed.inc();
    } catch (_) {}

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
};
