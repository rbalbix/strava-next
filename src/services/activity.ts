import {
  ActivityType,
  DetailedActivity,
  Strava,
  SummaryActivity,
  SummaryGear,
} from 'strava';

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

async function getActivities(
  strava: Strava,
  gears: SummaryGear[],
  before: number,
  after: number
) {
  let page = 1;
  let private_note = '';
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
          console.error(
            `Erro ao obter detalhes da atividade ${activity.id}:`,
            error
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
    })
  );

  return activitiesPreparedToStore;
}

export { getActivities };
