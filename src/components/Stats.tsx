import { Divider } from '@mui/material';
import { width } from '@mui/system';
import {
  addDays,
  addMonths,
  fromUnixTime,
  getUnixTime,
  startOfDay,
} from 'date-fns';
import { stringify } from 'querystring';
import React from 'react';
import { useContext, useEffect, useState } from 'react';
import { PushSpinner } from 'react-spinners-kit';
import {
  ActivityStats,
  ActivityType,
  DetailedAthlete,
  Strava,
  SummaryGear,
} from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import {
  getActivitiesSortedByGear,
  SummaryActivityWithNote,
} from '../services/activity';
import { getAthlete, getAthleteStats } from '../services/athlete';
import { Equipments } from '../services/equipment';
import { Equipment, GearStats, getGears } from '../services/gear';
import styles from '../styles/components/Stats.module.css';
import Card from './Card';

export default function Stats() {
  const { setAthleteInfo, setAthleteInfoStats, setErrorInfo, signIn, signOut } =
    useContext(AuthContext);

  const [gears, setGears] = useState([]);
  const [activities, setActivities] = useState<SummaryActivityWithNote[]>([]);
  const [gearStats, setGearStats] = useState<GearStats[]>([]);

  async function getAthleteInfo(strava: Strava) {
    const athlete: DetailedAthlete = await getAthlete(strava);
    setAthleteInfo(athlete);

    const athleteStats: ActivityStats = await getAthleteStats(strava, athlete);
    setAthleteInfoStats(athleteStats);

    return { athlete, athleteStats };
  }

  function getGearInfo(athlete: DetailedAthlete) {
    const gears = getGears(athlete);
    setGears(gears);

    return { gears };
  }

  async function getActivitiesInfo(
    strava: Strava,
    gears: SummaryGear[],
    after: number
  ) {
    const activities = await getActivitiesSortedByGear(strava, gears, after);
    setActivities(activities);

    return activities;
  }

  function createGearStats(
    gears: SummaryGear[],
    activities: SummaryActivityWithNote[]
  ) {
    const gearStats: GearStats[] = [];

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
          if (activity.name.includes('*') && activity.note) {
            equipments.forEach((equipment) => {
              if (activity.note?.includes(equipment.id)) {
                let equipmentStat = equipmentsStatTemplate.find(
                  ({ id }) => id === equipment.id
                );

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

  async function executeCompleteStats(strava: Strava, gears: SummaryGear[]) {
    const activities = await getActivitiesInfo(strava, gears, null);
    // const activities = await getActivitiesInfo(
    //   strava,
    //   gears,
    //   getUnixTime(addMonths(Date.now(), -2))
    // );
    const gearStats = createGearStats(gears, activities);

    setGearStats(gearStats);

    return gearStats;
  }

  async function updateStats(strava: Strava, gears: SummaryGear[]) {
    if (window.localStorage) {
      console.log('supports');
      if (localStorage.getItem('gear-stats')) {
        console.log('Tem gear-stats');
        // Pega data atualização
        // Soma dois meses e faz consulta
        //Se soma dois meses = hoje não precisa consulta
        // Guarda data atualização - hoje - 2 meses (start of day)
        // Como guarda estatistica atualizada ?
        // after + before
        // Soma as estatisticas e apresenta
      } else {
        const gearStats = await executeCompleteStats(strava, gears);
        const stats = {
          lastUpdated: getUnixTime(addMonths(startOfDay(Date.now()), -2)),
          gearStats,
        };
        localStorage.setItem('gear-stats', JSON.stringify(stats));
      }
    } else {
      await executeCompleteStats(strava, gears);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const strava = await signIn();
        const { athlete } = await getAthleteInfo(strava);
        const { gears } = getGearInfo(athlete);
        updateStats(strava, gears);
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
        {gears.length === 0 ||
        activities.length === 0 ||
        gearStats.length === 0 ? (
          <div className={styles.spinnerLoading}>
            <PushSpinner size={30} loading={true} />
            <span>Loading ...</span>
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
                <Divider style={{ width: '60%', margin: 'auto' }} />
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
