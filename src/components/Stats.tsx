import { Divider } from '@mui/material';
import { addDays, differenceInDays, fromUnixTime, getUnixTime } from 'date-fns';
import { useContext, useEffect, useState } from 'react';
import { TbBrandStrava } from 'react-icons/tb';
import { DetailedAthlete, Strava, SummaryGear } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import {
  ActivityBase,
  getActivities,
  verifyIfHasAnyActivities,
} from '../services/activity';
import { getAthlete, getAthleteStats } from '../services/athlete';
import { GearStats, verifyIfHasAnyGears } from '../services/gear';
import { createStatistics, updateStatistics } from '../services/statistics';
import {
  LocalActivity,
  mergeGearStats,
  saveLocalStat,
} from '../services/utils';
import styles from '../styles/components/Stats.module.css';
import Card from './Card';
import DiskIcon from './DiskIcon';
import TireIcon from './TireIcon';

export default function Stats() {
  const { setAthleteInfo, setAthleteInfoStats, setErrorInfo, signIn, signOut } =
    useContext(AuthContext);

  const [hasGear, setHasGear] = useState<boolean>(true);
  const [hasActivities, setHasActivities] = useState<boolean>(true);
  const [gearStats, setGearStats] = useState<GearStats[]>([]);
  const [randomIcon, setRandomIcon] = useState<JSX.Element | null>(null);

  function createGearStats(
    gears: SummaryGear[],
    activities: ActivityBase[],
    previousGearStats?: GearStats[]
  ) {
    if (!activities || activities.length == 0) {
      setHasActivities(false);
      return;
    }

    const gearStats = createStatistics(activities, gears);

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
    gears: SummaryGear[]
  ): Promise<ActivityBase[]> {
    const activities = await getActivities(strava, gears, null, null);
    createGearStats(gears, activities);
    return activities;
  }

  async function updateStats(strava: Strava, gears: SummaryGear[]) {
    const daysToSearch = 10;
    const cutoffDate = addDays(new Date(), -daysToSearch);
    try {
      const { id } = JSON.parse(sessionStorage.getItem('athlete'));
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
          const activities = await executeCompleteStats(strava, gears);

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

    const icon = Math.random() < 0.5 ? <DiskIcon /> : <TireIcon />;
    setRandomIcon(icon);

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

        setHasGear(verifyIfHasAnyGears(athlete));
        setHasActivities(await verifyIfHasAnyActivities(strava, athlete));

        // await updateStats(strava, gears);
        const updatedStatistics = await updateStatistics(strava, athlete.id);
        setGearStats(updatedStatistics);
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
        {!hasGear ? (
          <div className={styles.emptyState}>
            <TbBrandStrava size={50} className={styles.iconBrandStrava} />
            <span>Nenhum equipamento cadastrado no Strava</span>
            <span className={styles.emptyStateInstructionsText}>
              Vá em <code>Configurações &gt; Meu equipamento</code> e adicione
              um novo equipamento.
            </span>
          </div>
        ) : !hasActivities ? (
          <div className={styles.emptyState}>
            <TbBrandStrava size={50} className={styles.iconBrandStrava} />
            <span>
              Nenhuma atividade criada no Strava ou associada a um equipamento
            </span>
            <span className={styles.emptyStateInstructionsText}>
              Crie uma atividade ou associe a atividade ao seu equipamento
            </span>
          </div>
        ) : gearStats.length === 0 ? (
          <div className={styles.spinnerLoading}>
            <div>
              <span>Aguarde.</span>
              <span>Carregando suas atividades ...</span>
            </div>
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
