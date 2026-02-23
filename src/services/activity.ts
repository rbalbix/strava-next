import axios from 'axios';
import { getUnixTime } from 'date-fns';
import {
  ActivityType,
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

export type ActivityBase = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  type: ActivityType;
  start_date_local: string;
  gear_id: string;
  private_note: string;
};

export interface StravaAuthData {
  lastUpdated: number;
  activities: ActivityBase[];
}

async function getActivities(
  strava: Strava,
  gears: SummaryGear[],
  before: number,
  after: number,
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

  await Promise.all(
    activitiesFilteredByActiveGear.map(async (activity) => {
      let private_note = '';

      if (activity.name.includes('*')) {
        try {
          const detail: DetailedActivity =
            await strava.activities.getActivityById({
              id: activity.id,
            });
          private_note = detail.private_note || '';
        } catch (error) {
          getLogger().error(
            { err: error, activityId: activity.id },
            'Erro ao obter detalhes da atividade',
          );
        }
      }

      activitiesPreparedToStore.push({
        id: activity.id,
        name: activity.name,
        distance: activity.distance,
        moving_time: activity.moving_time,
        type: activity.type,
        start_date_local: activity.start_date_local,
        gear_id: activity.gear_id,
        private_note,
      });
    }),
  );

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

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      throw new Error(`Strava API error: ${status} - ${message}`);
    }

    throw error;
  }
}

async function processActivity(
  activity: DetailedActivity,
  athleteId: number,
): Promise<ActivityBase[]> {
  try {
    const { activities }: StravaAuthData = await redis.get(
      REDIS_KEYS.activities(athleteId),
    );

    // Update or insert the single activity
    const updatedActivities = updateActivityInArray(activity, activities || []);
    await processActivities(athleteId, updatedActivities);

    return updatedActivities;
  } catch (error) {
    getLogger().error(
      { err: error, activityId: activity.id },
      'Erro ao processar atividade',
    );
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
    console.log(`✅ Atividades processadas para ${athleteId}`);
  } else {
    throw new Error(`Erro ao processar atividades para ${athleteId}`);
  }
}

async function verifyIfHasAnyActivities(
  strava: Strava,
  athlete: DetailedAthlete,
): Promise<boolean> {
  try {
    const response = await strava.activities.getLoggedInAthleteActivities();
    return response !== null && response !== undefined && response.length !== 0;
  } catch (error) {
    console.error('Falha ao verificar existência de atividades', error);
    throw error;
  }
}

export {
  getActivities,
  processActivities,
  processActivity,
  verifyIfHasAnyActivities,
};
