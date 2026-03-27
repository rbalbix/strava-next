import { Divider } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { TbBrandStrava } from 'react-icons/tb';
import type { ActivityStats, DetailedAthlete } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import type { GearStats } from '../services/gear';
import styles from '../styles/components/Stats.module.css';
import Card from './Card';
import DiskIcon from './DiskIcon';
import TireIcon from './TireIcon';
import VeloIcon from './VeloIcon';

interface DashboardResponse {
  athlete: DetailedAthlete;
  athleteStats: ActivityStats;
  hasGear: boolean;
  hasActivities: boolean;
  gearStats: GearStats[];
}

const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedDashboard = {
  data: DashboardResponse;
  cacheTime: number;
};

function readCachedDashboard(): CachedDashboard | null {
  try {
    const cacheTimeRaw = sessionStorage.getItem('athleteCacheTime');
    if (!cacheTimeRaw) return null;

    const cacheTime = Number(cacheTimeRaw);
    if (!Number.isFinite(cacheTime)) return null;
    if (Date.now() - cacheTime > DASHBOARD_CACHE_TTL_MS) return null;

    const athleteRaw = sessionStorage.getItem('athlete');
    const athleteStatsRaw = sessionStorage.getItem('athleteStats');
    const gearStatsRaw = sessionStorage.getItem('gearStats');
    const hasGearRaw = sessionStorage.getItem('hasGear');
    const hasActivitiesRaw = sessionStorage.getItem('hasActivities');

    if (!athleteRaw || !athleteStatsRaw || !gearStatsRaw) return null;

    const athlete = JSON.parse(athleteRaw) as DetailedAthlete;
    const athleteStats = JSON.parse(athleteStatsRaw) as ActivityStats;
    const gearStats = JSON.parse(gearStatsRaw) as GearStats[];
    const hasGear = hasGearRaw === null ? true : hasGearRaw === 'true';
    const hasActivities =
      hasActivitiesRaw === null ? true : hasActivitiesRaw === 'true';

    return {
      data: {
        athlete,
        athleteStats,
        hasGear,
        hasActivities,
        gearStats,
      },
      cacheTime,
    };
  } catch (_) {
    return null;
  }
}

export default function Stats() {
  const { setAthleteInfo, setAthleteInfoStats, setErrorInfo, signOut } =
    useContext(AuthContext);

  const [hasGear, setHasGear] = useState<boolean>(true);
  const [hasActivities, setHasActivities] = useState<boolean>(true);
  const [gearStats, setGearStats] = useState<GearStats[]>([]);
  const [randomIcon, setRandomIcon] = useState<JSX.Element | null>(null);

  useEffect(() => {
    let isMounted = true;
    let hasFreshCache = false;

    const icons = [
      <DiskIcon key='disk' />,
      <TireIcon key='tire' />,
      <VeloIcon key='velo' />,
    ];
    const randomIndex = Math.floor(Math.random() * icons.length);
    setRandomIcon(icons[randomIndex]);

    const cachedData = readCachedDashboard();
    if (cachedData && isMounted) {
      hasFreshCache = true;
      setAthleteInfo(cachedData.data.athlete);
      setAthleteInfoStats(cachedData.data.athleteStats);
      setHasGear(cachedData.data.hasGear);
      setHasActivities(cachedData.data.hasActivities);
      setGearStats(cachedData.data.gearStats || []);
    }

    if (cachedData) {
      return () => {
        isMounted = false;
      };
    }

    async function init() {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error(`Failed to load dashboard: HTTP ${response.status}`);
        }

        const data: DashboardResponse = await response.json();
        if (!isMounted) return;

        sessionStorage.setItem('athlete', JSON.stringify(data.athlete));
        sessionStorage.setItem('athleteStats', JSON.stringify(data.athleteStats));
        sessionStorage.setItem('gearStats', JSON.stringify(data.gearStats || []));
        sessionStorage.setItem('hasGear', String(data.hasGear));
        sessionStorage.setItem('hasActivities', String(data.hasActivities));
        sessionStorage.setItem('athleteCacheTime', Date.now().toString());

        setAthleteInfo(data.athlete);
        setAthleteInfoStats(data.athleteStats);
        setHasGear(data.hasGear);
        setHasActivities(data.hasActivities);
        setGearStats(data.gearStats || []);
      } catch (error) {
        if (isMounted) {
          setErrorInfo(error);
          if (!hasFreshCache) {
            signOut();
          }
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [setAthleteInfo, setAthleteInfoStats, setErrorInfo, signOut]);

  return (
    <div className={styles.statsContainer}>
      <main>
        {!hasGear ? (
          <div className={styles.emptyState}>
            <TbBrandStrava
              size={50}
              className={styles.iconBrandStrava}
              aria-hidden='true'
              focusable='false'
            />
            <span>Nenhum equipamento cadastrado no Strava</span>
            <span className={styles.emptyStateInstructionsText}>
              Vá em <code>Configurações &gt; Meu equipamento</code> e adicione
              um novo equipamento.
            </span>
          </div>
        ) : !hasActivities ? (
          <div className={styles.emptyState}>
            <TbBrandStrava
              size={50}
              className={styles.iconBrandStrava}
              aria-hidden='true'
              focusable='false'
            />
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
              <span>Carregando suas estatísticas ...</span>
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
