import { Divider } from '@mui/material';
import { addDays, differenceInDays, fromUnixTime, getUnixTime } from 'date-fns';
import { useContext, useEffect, useState } from 'react';
import {
  ActivityStats,
  ActivityType,
  DetailedAthlete,
  Strava,
  SummaryGear,
} from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import { ActivityBase, getActivities } from '../services/activity';
import { getAthlete, getAthleteStats } from '../services/athlete';
import { Equipments } from '../services/equipment';
import {
  Equipment,
  GearStats,
  SummaryGearWithNickName,
  getGears,
} from '../services/gear';
import { LocalActivity, saveLocalStat } from '../services/utils';
import styles from '../styles/components/Stats.module.css';
import Card from './Card';
import DiskIcon from './DiskIcon';

export default function Stats() {
  const { setAthleteInfo, setAthleteInfoStats, setErrorInfo, signIn, signOut } =
    useContext(AuthContext);

  const [gearStats, setGearStats] = useState<GearStats[]>([]);

  async function getAthleteInfo(strava: Strava) {
    const athlete: DetailedAthlete = await getAthlete(strava);
    setAthleteInfo(athlete);

    const athleteStats: ActivityStats = await getAthleteStats(strava, athlete);
    setAthleteInfoStats(athleteStats);

    return { athlete, athleteStats };
  }

  function createGearStats(
    gears: SummaryGearWithNickName[],
    activities: ActivityBase[]
  ) {
    const gearStats: GearStats[] = [];

    activities.sort((a, b) => {
      if (a.start_date_local < b.start_date_local) return 1;
      if (a.start_date_local > b.start_date_local) return -1;
      return 0;
    });

    activities.sort((a, b) => {
      if (a.gear_id > b.gear_id) return 1;
      if (a.gear_id < b.gear_id) return -1;
      return 0;
    });

    gears.map((gear) => {
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
          distance: 0,
          movingTime: 0,
          date: '',
          isRegistered: false,
        });
      });

      activities.map((activity) => {
        if (activity.gear_id === gear.id) {
          if (activity.name.includes('*')) {
            equipments.forEach((equipment) => {
              if (activity.private_note.includes(equipment.id)) {
                let equipmentStat = equipmentsStatTemplate.find(
                  ({ id }) => id === equipment.id
                );

                // When tubeless, tubes does not matter.
                if (equipment.id === Equipments.Tubeless.id) {
                  equipmentsStatTemplate.map((e) => {
                    if (
                      e.id === Equipments.Tube.id ||
                      e.id === Equipments.FrontTube.id ||
                      e.id === Equipments.RearTube.id
                    ) {
                      e.isRegistered = true;
                    }
                  });
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
          name: gear.nickname,
          activityType,
          count,
          distance,
          movingTime,
          equipments: equipmentsStat,
        };

        gearStats.push(gearStat);
      }
    });

    setGearStats(gearStats);
    return gearStats;
  }

  async function executeCompleteStats(
    strava: Strava,
    gears: SummaryGearWithNickName[]
  ) {
    const activities = await getActivities(strava, gears, null, null);
    createGearStats(gears, activities);
    return { activities };
  }

  async function updateStats(strava: Strava, gears: SummaryGearWithNickName[]) {
    const daysToSearch = 10;
    try {
      if (window.localStorage) {
        if (localStorage.getItem('local-stat') !== null) {
          const localActivities: LocalActivity = JSON.parse(
            localStorage.getItem('local-stat')
          );

          const activitiesFromStravaAPI = await getActivities(
            strava,
            gears,
            null,
            localActivities.lastUpdated
          );

          createGearStats(gears, [
            ...activitiesFromStravaAPI,
            ...localActivities.activities,
          ]);

          // store the activities difference, if exists
          if (
            differenceInDays(
              addDays(new Date(), -daysToSearch),
              fromUnixTime(localActivities.lastUpdated)
            ) !== 0
          ) {
            const activitiesToStore = activitiesFromStravaAPI.filter(
              (activity) => {
                return (
                  new Date(activity.start_date_local) <
                  addDays(new Date(), -daysToSearch)
                );
              }
            );

            saveLocalStat({
              lastUpdated: getUnixTime(addDays(new Date(), -daysToSearch)),
              activities: [...activitiesToStore, ...localActivities.activities],
            });
          }
        } else {
          const { activities } = await executeCompleteStats(strava, gears);

          const activitiesToStore = activities.filter((activity) => {
            return (
              new Date(activity.start_date_local) <
              addDays(new Date(), -daysToSearch)
            );
          });

          saveLocalStat({
            lastUpdated: getUnixTime(addDays(new Date(), -daysToSearch)),
            activities: activitiesToStore,
          });
        }
      } else {
        await executeCompleteStats(strava, gears);
      }
    } catch (error) {
      setErrorInfo(error);
      signOut();
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const strava = await signIn();
        const { athlete } = await getAthleteInfo(strava);
        const gears = getGears(athlete);
        await updateStats(strava, gears);
      } catch (error) {
        setErrorInfo(error);
        signOut();
      }
    }

    init();
  }, []);

  return (
    <div className={styles.statsContainer}>
      <main>
        {gearStats.length === 0 ? (
          <div className={styles.spinnerLoading}>
            <span>
              <DiskIcon />
            </span>
          </div>
        ) : (
          gearStats.map((gearStat, index) => {
            return (
              <div key={index}>
                <Card
                  key={gearStat.id}
                  id={gearStat.id}
                  name={gearStat.name}
                  activityType={gearStat.activityType}
                  count={gearStat.count}
                  distance={gearStat.distance}
                  movingTime={gearStat.movingTime}
                  equipments={gearStat.equipments}
                />
                <Divider
                  className={styles.divider}
                  style={{ margin: 'auto' }}
                />
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
