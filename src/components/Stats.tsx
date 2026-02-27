import { Divider } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { TbBrandStrava } from 'react-icons/tb';
import { ActivityStats, DetailedAthlete } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import { GearStats } from '../services/gear';
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

export default function Stats() {
  const { setAthleteInfo, setAthleteInfoStats, setErrorInfo, signOut } =
    useContext(AuthContext);

  const [hasGear, setHasGear] = useState<boolean>(true);
  const [hasActivities, setHasActivities] = useState<boolean>(true);
  const [gearStats, setGearStats] = useState<GearStats[]>([]);
  const [randomIcon, setRandomIcon] = useState<JSX.Element | null>(null);

  useEffect(() => {
    let isMounted = true;

    const icons = [<DiskIcon />, <TireIcon />, <VeloIcon />];
    const randomIndex = Math.floor(Math.random() * icons.length);
    setRandomIcon(icons[randomIndex]);

    // const icon = Math.random() < 0.5 ? <DiskIcon /> : <TireIcon />;
    // setRandomIcon(icon);

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
        sessionStorage.setItem('athleteCacheTime', Date.now().toString());

        setAthleteInfo(data.athlete);
        setAthleteInfoStats(data.athleteStats);
        setHasGear(data.hasGear);
        setHasActivities(data.hasActivities);
        setGearStats(data.gearStats || []);
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
