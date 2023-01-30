import { DetailedActivity, Strava, SummaryActivity, SummaryGear } from 'strava';

export type SummaryActivityWithNote = SummaryActivity & {
  note?: string;
};

export type DetailedActivityWithNote = DetailedActivity & {
  private_note?: string;
};

async function getActivitiesSortedByGear(
  strava: Strava,
  gears: SummaryGear[],
  after: number
) {
  const gearIds = [];
  let page = 1;
  let activitiesResult = [];
  const activitiesResultTotal: SummaryActivityWithNote[] = [];

  gears.forEach((gear) => gearIds.push(gear['id']));

  do {
    activitiesResult = await strava.activities.getLoggedInAthleteActivities({
      per_page: 200,
      page,
    });

    const activitiesWithGear = activitiesResult.filter((activity) => {
      return activity.gear_id != null && gearIds.includes(activity.gear_id);
    });

    activitiesWithGear.map(async (activity) => {
      if (activity.name.includes('*')) {
        const detail: DetailedActivityWithNote =
          await strava.activities.getActivityById({
            id: activity.id,
          });
        activity.note = detail.private_note;
      }
    });

    activitiesResultTotal.push(...activitiesWithGear);
    page++;
  } while (activitiesResult.length !== 0 && page > 1);

  activitiesResultTotal.sort((a, b) => {
    if (a.gear_id > b.gear_id) return 1;
    if (a.gear_id < b.gear_id) return -1;
    return 0;
  });

  return activitiesResultTotal;
}

export { getActivitiesSortedByGear };
