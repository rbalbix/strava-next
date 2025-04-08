import { Divider } from '@mui/material';
import { addDays, differenceInDays, fromUnixTime, getUnixTime } from 'date-fns';
import { useContext, useEffect, useState } from 'react';
import { ActivityType, DetailedAthlete, Strava } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import { ActivityBase, getActivities } from '../services/activity';
import { getAthlete, getAthleteStats } from '../services/athlete';
import { Equipment, Equipments } from '../services/equipment';
import { GearStats, SummaryGearWithNickName, getGears } from '../services/gear';
import { LocalActivity, saveLocalStat } from '../services/utils';
import styles from '../styles/components/Stats.module.css';
import Card from './Card';
import DiskIcon from './DiskIcon';
import TireIcon from './TireIcon';
import { mergeGearStats } from '../services/mergeGearStats';

export default function Stats() {
  const { setAthleteInfo, setAthleteInfoStats, setErrorInfo, signIn, signOut } =
    useContext(AuthContext);

  const [gearStats, setGearStats] = useState<GearStats[]>([]);

  const [randomIcon] = useState(
    Math.random() < 0.5 ? <DiskIcon /> : <TireIcon />
  );

  function createGearStats(
    gears: SummaryGearWithNickName[],
    activities: ActivityBase[],
    previousGearStats?: GearStats[]
  ) {
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
          if (activity.name.includes('*')) {
            equipments.forEach((equipment) => {
              if (activity.private_note.includes(equipment.id)) {
                let equipmentStat = equipmentsStatTemplate.find(
                  ({ id }) => id === equipment.id
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

                  // When pair of breaks, only rear or front does not matter.
                  case Equipments.Break.id:
                    equipmentsStatTemplate.forEach((e) => {
                      if (
                        e.id === Equipments.FrontBreak.id ||
                        e.id === Equipments.RearBreak.id
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
                  activity.private_note.toLowerCase()
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
          name: gear.nickname === '' ? gear.name : gear.nickname,
          activityType,
          count,
          distance,
          movingTime,
          equipments: equipmentsStat,
        };

        gearStats.push(gearStat);
      }
    });

    if (previousGearStats) {
      const merged = mergeGearStats(previousGearStats, gearStats);
      setGearStats(merged);
      return merged;
    }

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
    const cutoffDate = addDays(new Date(), -daysToSearch);
    try {
      if (window.localStorage) {
        if (localStorage.getItem('local-stat') !== null) {
          const localStatData = localStorage.getItem('local-stat');
          if (localStatData) {
            try {
              const localActivities: LocalActivity = JSON.parse(localStatData);

              const activitiesFromStravaAPI = await getActivities(
                strava,
                gears,
                null,
                localActivities.lastUpdated
              );

              createGearStats(
                gears,
                [...activitiesFromStravaAPI, ...localActivities.activities],
                gearStats
              );

              // store the activities difference, if exists
              if (
                differenceInDays(
                  cutoffDate,
                  fromUnixTime(localActivities.lastUpdated)
                ) !== 0
              ) {
                const activitiesToStore = activitiesFromStravaAPI.filter(
                  (activity) => {
                    return new Date(activity.start_date_local) < cutoffDate;
                  }
                );

                saveLocalStat({
                  lastUpdated: getUnixTime(cutoffDate),
                  activities: [
                    ...activitiesToStore,
                    ...localActivities.activities,
                  ],
                });
              }
            } catch (error) {
              console.warn('Erro ao carregar estatísticas locais:', error);
              setErrorInfo(error);
              signOut();
            }
          }
        } else {
          const { activities } = await executeCompleteStats(strava, gears);

          const activitiesToStore = activities.filter((activity) => {
            return new Date(activity.start_date_local) < cutoffDate;
          });

          saveLocalStat({
            lastUpdated: getUnixTime(cutoffDate),
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
    let isMounted = true;

    async function init() {
      try {
        const strava = await signIn();
        if (!isMounted) return;

        let athlete: DetailedAthlete;

        const cachedAthlete = sessionStorage.getItem('athlete');
        const cachedStats = sessionStorage.getItem('athleteStats');

        const MAX_AGE = 3 * 60 * 60 * 1000; // 3 horas

        const cachedTime = Number(sessionStorage.getItem('athleteCacheTime'));
        const isFresh = Date.now() - cachedTime < MAX_AGE;

        if (cachedAthlete && cachedStats && isFresh) {
          athlete = JSON.parse(cachedAthlete);
          setAthleteInfo(athlete);
          setAthleteInfoStats(JSON.parse(cachedStats));
        } else {
          athlete = await getAthlete(strava);
          const stats = await getAthleteStats(strava, athlete);

          sessionStorage.setItem('athlete', JSON.stringify(athlete));
          sessionStorage.setItem('athleteStats', JSON.stringify(stats));
          sessionStorage.setItem('athleteCacheTime', Date.now().toString());

          setAthleteInfo(athlete);
          setAthleteInfoStats(stats);
        }

        const gears = getGears(athlete);
        await updateStats(strava, gears);
      } catch (error) {
        if (isMounted) {
          setErrorInfo(error);
          signOut();
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={styles.statsContainer}>
      <main>
        {gearStats.length === 0 ? (
          <div className={styles.spinnerLoading}>
            <span>{randomIcon}</span>
          </div>
        ) : (
          gearStats.map((gearStat) => {
            return (
              <div key={gearStat.id}>
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
1;
