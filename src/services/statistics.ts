import { ActivityType, Strava, SummaryGear } from 'strava';
import { REDIS_KEYS } from '../config';
import { ActivityBase, getActivities, processActivities } from './activity';

import { differenceInMinutes, fromUnixTime, getUnixTime } from 'date-fns';
import { apiRemoteStorage } from './api';
import { getAthlete } from './athlete';
import { Equipment, Equipments } from './equipment';
import { GearStats, getGears } from './gear';
import { saveRemote } from './utils';
import { getLogger } from './logger';

export async function updateStatistics(
  strava: Strava,
  athleteId: number,
): Promise<GearStats[]> {
  const storedActivities = await apiRemoteStorage.get(
    REDIS_KEYS.activities(athleteId),
  );

  const storedStatistics = await apiRemoteStorage.get(
    REDIS_KEYS.statistics(athleteId),
  );

  if (
    storedActivities.data !== null &&
    storedActivities.data !== undefined &&
    Object.keys(storedActivities.data).length !== 0 &&
    storedStatistics.data !== null &&
    storedStatistics.data !== undefined &&
    Object.keys(storedStatistics.data).length !== 0 &&
    differenceInMinutes(
      fromUnixTime(storedStatistics.data.lastUpdated),
      fromUnixTime(storedActivities.data.lastUpdated),
    ) === 0
  ) {
    return storedStatistics.data.statistics;
  } else {
    const athlete = await getAthlete(strava);
    const gears = getGears(athlete);
    let activitiesToNewStatistics: ActivityBase[] = [];

    if (
      !storedActivities.data ||
      storedActivities.data === null ||
      storedActivities.data === undefined ||
      Object.keys(storedActivities.data).length === 0
    ) {
      // Recupera todas as atividades
      activitiesToNewStatistics = await getActivities(
        strava,
        gears,
        null,
        null,
      );
    } else {
      // Recupera apenas as atividades criadas depois de lastUpdated
      const { lastUpdated, activities } = storedActivities.data;

      const activitiesFromStravaAPI = await getActivities(
        strava,
        gears,
        null,
        lastUpdated,
      );
      activitiesToNewStatistics = [...activitiesFromStravaAPI, ...activities];
    }

    await processActivities(athleteId, activitiesToNewStatistics);
    const updatedStatistics = await processStatistics(
      strava,
      athleteId,
      activitiesToNewStatistics,
    );
    return updatedStatistics;
  }
}

export async function processStatistics(
  strava: Strava,
  athleteId: number,
  updatedActivities: ActivityBase[],
): Promise<GearStats[]> {
  const athlete = await getAthlete(strava);
  const gears = getGears(athlete);

  const updatedStatistics = createStatistics(updatedActivities, gears);
  const response = await saveRemote(
    REDIS_KEYS.statistics(athleteId),
    JSON.stringify({
      lastUpdated: getUnixTime(Date.now()),
      statistics: updatedStatistics,
    }),
  );
  if (response.success) {
    getLogger().info({ athleteId }, `Estatística processada para ${athleteId}`);
    return updatedStatistics;
  } else {
    throw new Error(`Erro ao processar estatísticas para ${athleteId}`);
  }
}

export function createStatistics(
  activities: ActivityBase[],
  gears: SummaryGear[],
): GearStats[] {
  const gearStats: GearStats[] = [];

  activities.sort((a, b) => {
    if (a.gear_id !== b.gear_id) {
      return a.gear_id.localeCompare(b.gear_id);
    }
    return b.start_date_local.localeCompare(a.start_date_local);
  });

  gears.forEach((gear) => {
    let count = 0;
    let distance = 0;
    let movingTime = 0;
    let activityType: ActivityType = null;

    const equipmentsStatTemplate: Equipment[] = [];
    const equipmentsStat: Equipment[] = [];

    const equipments = Object.values(Equipments);
    equipments.forEach((equipment) => {
      equipmentsStatTemplate.push({
        id: equipment.id,
        caption: equipment.caption,
        show: equipment.show,
        distance: 0,
        movingTime: 0,
        date: '',
        isRegistered: false,
      });
    });

    activities.forEach((activity) => {
      if (activity.gear_id === gear.id) {
        if (activity.name && activity.name.includes('*')) {
          equipments.forEach((equipment) => {
            if (
              activity.private_note &&
              activity.private_note.includes(equipment.id)
            ) {
              let equipmentStat = equipmentsStatTemplate.find(
                ({ id }) => id === equipment.id,
              );

              switch (equipment.id) {
                // When tubeless, tubes does not matter.
                case Equipments.Tubeless.id:
                  equipmentsStatTemplate.forEach((e) => {
                    if (
                      e.id === Equipments.Tube.id ||
                      e.id === Equipments.FrontTube.id ||
                      e.id === Equipments.RearTube.id
                    ) {
                      e.isRegistered = true;
                    }
                  });
                  break;

                // When pair of brakes, only rear or front does not matter.
                case Equipments.Brake.id:
                  equipmentsStatTemplate.forEach((e) => {
                    if (
                      e.id === Equipments.FrontBrake.id ||
                      e.id === Equipments.RearBrake.id
                    ) {
                      e.isRegistered = true;
                    }
                  });
                  break;

                // When new suspension, suspencion review/kit does not matter.
                case Equipments.Suspension.id:
                  equipmentsStatTemplate.forEach((e) => {
                    if (
                      e.id === Equipments.SuspensionReview.id ||
                      e.id === Equipments.SuspensionKit.id
                    ) {
                      e.isRegistered = true;
                    }
                  });
                  break;

                // When new shock, shock review/kit does not matter.
                case Equipments.Shock.id:
                  equipmentsStatTemplate.forEach((e) => {
                    if (
                      e.id === Equipments.ShockReview.id ||
                      e.id === Equipments.ShockKit.id
                    ) {
                      e.isRegistered = true;
                    }
                  });
                  break;
              }

              // When suspension review or shock review, the word
              // review seems to be a new review.
              // Checks if the word "review" is isolated in private_note
              const hasStandaloneReview = /\breview\b/.test(
                activity.private_note.toLowerCase(),
              );
              if (
                equipment.id === Equipments.Review.id &&
                !hasStandaloneReview
              ) {
                return; // Next iteration
              }

              if (equipmentStat && !equipmentStat.isRegistered) {
                equipmentStat.isRegistered = true;
                equipmentStat.distance = distance;
                equipmentStat.movingTime = movingTime;
                equipmentStat.date = activity.start_date_local;
                equipmentsStat.push(equipmentStat);
              }
            }
          });
        }

        movingTime += activity.moving_time;
        distance += activity.distance;
        activityType = activity.type;
        count++;
      }
    });

    if (distance !== 0) {
      const gearStat: GearStats = {
        id: gear.id,
        name: gear.name,
        activityType,
        count,
        distance,
        movingTime,
        equipments: equipmentsStat,
      };

      gearStats.push(gearStat);
    }
  });

  return gearStats;
}
