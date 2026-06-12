import { Divider } from '@mui/material';
import { useContext, useEffect, useState, useRef } from 'react';
import { TbBrandStrava } from 'react-icons/tb';
import type { DetailedAthlete, ActivityStats } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import type { DashboardResponse, EquipmentThresholds } from '../contracts/api';
import type { GearStats } from '../services/gear';
import { computeThresholdState } from '../utils/thresholds';
import styles from '../styles/components/Stats.module.css';
import Card from './Card';
import DiskIcon from './DiskIcon';
import TireIcon from './TireIcon';
import VeloIcon from './VeloIcon';
import { useAutoSync } from '../hooks/useAutoSync';

const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedDashboard = {
  data: DashboardResponse;
  cacheTime: number;
};

type ThresholdAlertItem = {
  gearId: string;
  gearName: string;
  equipmentId: string;
  label: string;
  distanceKm: number;
  thresholdKm: number;
  state: 'normal' | 'warning' | 'overdue';
};

function buildThresholdAlertItems(
  dashboard: DashboardResponse,
): ThresholdAlertItem[] {
  const thresholds = dashboard.equipmentThresholds ?? {};

  return dashboard.gearStats.flatMap((gearStat) => {
    const gearThresholds = thresholds[gearStat.id] ?? {};

    return gearStat.equipments
      .map((equipment) => {
        const thresholdKm = gearThresholds[equipment.id];
        const distanceKm = (equipment.distance ?? 0) / 1000;
        const state = computeThresholdState(distanceKm, thresholdKm);

        if (state === 'no-threshold') {
          return null;
        }

        return {
          gearId: gearStat.id,
          gearName: gearStat.name,
          equipmentId: equipment.id,
          label: equipment.caption,
          distanceKm,
          thresholdKm: thresholdKm ?? 0,
          state,
        };
      })
      .filter((item): item is ThresholdAlertItem => item !== null);
  });
}

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
    const equipmentThresholds = JSON.parse(
      sessionStorage.getItem('equipmentThresholds') ?? '{}',
    ) as EquipmentThresholds;
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
        equipmentThresholds,
      },
      cacheTime,
    };
  } catch (_) {
    return null;
  }
}

export default function Stats() {
  const {
    setAthleteInfo,
    setAthleteInfoStats,
    setErrorInfo,
    signOut,
    openModal,
    activeModal,
    closeModal,
  } = useContext(AuthContext);

  const [hasGear, setHasGear] = useState<boolean>(true);
  const [hasActivities, setHasActivities] = useState<boolean>(true);
  const [gearStats, setGearStats] = useState<GearStats[]>([]);
  const [randomIcon, setRandomIcon] = useState<JSX.Element | null>(null);

  const { dashboard, isError } = useAutoSync();
  const alertedEquipmentIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const icons = [
      <DiskIcon key='disk' />,
      <TireIcon key='tire' />,
      <VeloIcon key='velo' />,
    ];
    const randomIndex = Math.floor(Math.random() * icons.length);
    setRandomIcon(icons[randomIndex]);

    const cachedData = readCachedDashboard();
    if (cachedData) {
      setAthleteInfo(cachedData.data.athlete);
      setAthleteInfoStats(cachedData.data.athleteStats);
      setHasGear(cachedData.data.hasGear);
      setHasActivities(cachedData.data.hasActivities);
      setGearStats(cachedData.data.gearStats || []);

      // Initialize alerted set from initial overdue items (valid ones only)
      const overdueItems = buildThresholdAlertItems(cachedData.data).filter(
        (item) => item.state === 'overdue' && item.thresholdKm > 0,
      );
      overdueItems.forEach((item) =>
        alertedEquipmentIds.current.add(item.equipmentId),
      );
    }
  }, [setAthleteInfo, setAthleteInfoStats]);

  useEffect(() => {
    if (dashboard) {
      sessionStorage.setItem('athlete', JSON.stringify(dashboard.athlete));
      sessionStorage.setItem(
        'athleteStats',
        JSON.stringify(dashboard.athleteStats),
      );
      sessionStorage.setItem(
        'gearStats',
        JSON.stringify(dashboard.gearStats || []),
      );
      sessionStorage.setItem(
        'equipmentThresholds',
        JSON.stringify(dashboard.equipmentThresholds ?? {}),
      );
      sessionStorage.setItem('hasGear', String(dashboard.hasGear));
      sessionStorage.setItem('hasActivities', String(dashboard.hasActivities));
      sessionStorage.setItem('athleteCacheTime', Date.now().toString());

      setAthleteInfo(dashboard.athlete);
      setAthleteInfoStats(dashboard.athleteStats);
      setHasGear(dashboard.hasGear);
      setHasActivities(dashboard.hasActivities);
      setGearStats(dashboard.gearStats || []);

      // Trigger alert only for NEW overdue items
      const currentOverdueItems = buildThresholdAlertItems(dashboard).filter(
        (item) => item.state === 'overdue' && item.thresholdKm > 0,
      );

      // If modal is open for threshold alerts and no overdue items remain, close it
      if (
        activeModal === 'threshold-alert' &&
        currentOverdueItems.length === 0
      ) {
        closeModal();
      }

      const newOverdueItems = currentOverdueItems.filter(
        (item) => !alertedEquipmentIds.current.has(item.equipmentId),
      );

      if (newOverdueItems.length > 0) {
        openModal('threshold-alert', {
          items: currentOverdueItems, // Show all current overdue items
          gearStats: dashboard.gearStats,
        });
        newOverdueItems.forEach((item) =>
          alertedEquipmentIds.current.add(item.equipmentId),
        );
      }

      // Cleanup: remove items that are no longer overdue
      const currentOverdueIds = new Set(
        currentOverdueItems.map((item) => item.equipmentId),
      );
      alertedEquipmentIds.current.forEach((id) => {
        if (!currentOverdueIds.has(id)) {
          alertedEquipmentIds.current.delete(id);
        }
      });
    } else if (isError) {
      setErrorInfo(isError);
      // If it's a 401 (Unauthorized), sign out immediately, regardless of cache.
      if (isError instanceof Error && isError.message.includes('401')) {
        signOut();
      } else if (!readCachedDashboard()) {
        signOut();
      }
    }
  }, [
    dashboard,
    isError,
    setAthleteInfo,
    setAthleteInfoStats,
    setErrorInfo,
    signOut,
    openModal,
    closeModal,
    activeModal,
  ]);

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
            <div className={styles.loadingPanel}>
              <div>
                <span>Aguarde.</span>
                <span>Carregando suas estatísticas ...</span>
              </div>
              <span>{randomIcon}</span>
            </div>
            <div className={styles.skeletonList} aria-hidden='true'>
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
            </div>
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
