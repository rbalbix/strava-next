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
  const gearIds = [];
  let private_note = '';
  const activities: SummaryActivity[] = [];
  let data: SummaryActivity[] = [];
  const activitiesPreparedToStore: ActivityBase[] = [];

  gears.forEach((gear) => gearIds.push(gear['id']));

  do {
    after & before
      ? (data = await strava.activities.getLoggedInAthleteActivities({
          before,
          after,
          per_page: 200,
          page,
        }))
      : before
      ? (data = await strava.activities.getLoggedInAthleteActivities({
          before,
          per_page: 200,
          page,
        }))
      : after
      ? (data = await strava.activities.getLoggedInAthleteActivities({
          after,
          per_page: 200,
          page,
        }))
      : (data = await strava.activities.getLoggedInAthleteActivities({
          per_page: 200,
          page,
        }));

    activities.push(...data);
    page++;
  } while (data.length !== 0 && page > 1);

  const activitiesFilteredByActiveGear = activities.filter((activity) => {
    return activity.gear_id != null && gearIds.includes(activity.gear_id);
  });

  await Promise.all(
    activitiesFilteredByActiveGear.map(async (activity) => {
      if (activity.name.includes('*')) {
        const detail: DetailedActivity =
          await strava.activities.getActivityById({
            id: activity.id,
          });
        private_note = detail.private_note;
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
