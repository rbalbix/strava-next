import { Divider } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { useContext, useEffect, useState, useRef } from 'react';
import { MdWarningAmber } from 'react-icons/md';
import { TbBrandStrava } from 'react-icons/tb';
import type { DetailedAthlete, ActivityStats } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import type {
  DashboardResponse,
  EquipmentThresholds,
  ThresholdUnit,
  UnrecognizedCode,
} from '../contracts/api';
import type { GearStats } from '../services/gear';
import { getHttpStatus } from '../lib/apiClient';
import {
  computeThresholdState,
  resolveCurrentConsumption,
} from '../utils/thresholds';
import styles from '../styles/components/Stats.module.css';
import Card from './Card';
import DiskIcon from './DiskIcon';
import ErroMsg from './ErroMsg';
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
  current: number;
  limit: number;
  unit: ThresholdUnit;
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
        const entry = gearThresholds[equipment.id];

        if (!entry) {
          return null;
        }

        const current = resolveCurrentConsumption(entry, equipment);
        const state = computeThresholdState(current, entry.value);

        if (state === 'no-threshold') {
          return null;
        }

        return {
          gearId: gearStat.id,
          gearName: gearStat.name,
          equipmentId: equipment.id,
          label: equipment.caption,
          current,
          limit: entry.value,
          unit: entry.unit,
          state,
        };
      })
      .filter((item): item is ThresholdAlertItem => item !== null);
  });
}

// Identidade de um alerta de limite: o equipmentId (ex.: 'chain') existe em
// TODO gear — a deduplicação precisa do par, senão a segunda bike nunca alerta.
const thresholdAlertKey = (item: { gearId: string; equipmentId: string }) =>
  `${item.gearId}:${item.equipmentId}`;

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
    // D14: casos não reconhecidos entram na mesma cache do dashboard para
    // o banner pintar sem esperar a rede.
    const unrecognizedCodes = JSON.parse(
      sessionStorage.getItem('unrecognizedCodes') ?? '[]',
    ) as UnrecognizedCode[];
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
        unrecognizedCodes,
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
  // D14: casos não reconhecidos + dispensa da sessão (Set por identidade
  // activityId:word — rename de gear não reabre; recarregar volta a ver).
  const [unrecognizedCodes, setUnrecognizedCodes] = useState<
    UnrecognizedCode[]
  >([]);
  const [dismissedCases, setDismissedCases] = useState<Set<string>>(new Set());

  const { dashboard, isError, mutate } = useAutoSync();
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
      setUnrecognizedCodes(cachedData.data.unrecognizedCodes || []);

      // Initialize alerted set from initial overdue items (valid ones only)
      const overdueItems = buildThresholdAlertItems(cachedData.data).filter(
        (item) => item.state === 'overdue' && item.limit > 0,
      );
      overdueItems.forEach((item) =>
        alertedEquipmentIds.current.add(thresholdAlertKey(item)),
      );
    }
  }, [setAthleteInfo, setAthleteInfoStats]);

  useEffect(() => {
    const isUnauthorized = getHttpStatus(isError) === 401;

    // Trata 401 antes de `dashboard`: o SWR mantém o último valor em cache,
    // então uma sessão revogada durante o uso chega como dashboard + erro.
    // Não há recuperação OAuth automática: se a sessão do Strava também tiver
    // acabado, o redirect de topo mostraria a tela de login do Strava sem uma
    // ação do usuário. O app não tem uma API silenciosa para saber isso antes
    // de redirecionar. Assim, 401 sempre limpa cookies e pousa na landing;
    // entrar no Strava é uma ação explícita no CTA da landing.
    if (isUnauthorized) {
      signOut();
      return;
    }

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
      sessionStorage.setItem(
        'unrecognizedCodes',
        JSON.stringify(dashboard.unrecognizedCodes ?? []),
      );
      sessionStorage.setItem('hasGear', String(dashboard.hasGear));
      sessionStorage.setItem('hasActivities', String(dashboard.hasActivities));
      sessionStorage.setItem('athleteCacheTime', Date.now().toString());

      setAthleteInfo(dashboard.athlete);
      setAthleteInfoStats(dashboard.athleteStats);
      setHasGear(dashboard.hasGear);
      setHasActivities(dashboard.hasActivities);
      setGearStats(dashboard.gearStats || []);
      setUnrecognizedCodes(dashboard.unrecognizedCodes || []);

      // Onboarding one-shot (design D2): a primeira carga com zero
      // manutenções registradas ensina a mecânica central sem depender do
      // menu lateral. A flag é gravada ANTES de abrir — protege contra o
      // duplo efeito do StrictMode e contra o poll de 60s reabrir a modal.
      // O cache de sessionStorage não conta: só dados frescos disparam.
      const totalRegisteredEvents = dashboard.gearStats.reduce(
        (sum, gear) => sum + gear.equipments.length,
        0,
      );
      if (
        totalRegisteredEvents === 0 &&
        !localStorage.getItem('gl_onboardingShown')
      ) {
        localStorage.setItem('gl_onboardingShown', '1');
        openModal('info');
      }

      // Trigger alert only for NEW overdue items
      const currentOverdueItems = buildThresholdAlertItems(dashboard).filter(
        (item) => item.state === 'overdue' && item.limit > 0,
      );

      // If modal is open for threshold alerts and no overdue items remain, close it
      if (
        activeModal === 'threshold-alert' &&
        currentOverdueItems.length === 0
      ) {
        closeModal();
      }

      const newOverdueItems = currentOverdueItems.filter(
        (item) => !alertedEquipmentIds.current.has(thresholdAlertKey(item)),
      );

      if (newOverdueItems.length > 0) {
        openModal('threshold-alert', {
          items: currentOverdueItems, // Show all current overdue items
          gearStats: dashboard.gearStats,
        });
        newOverdueItems.forEach((item) =>
          alertedEquipmentIds.current.add(thresholdAlertKey(item)),
        );
      }

      // Cleanup: remove items that are no longer overdue
      const currentOverdueIds = new Set(
        currentOverdueItems.map((item) => thresholdAlertKey(item)),
      );
      alertedEquipmentIds.current.forEach((id) => {
        if (!currentOverdueIds.has(id)) {
          alertedEquipmentIds.current.delete(id);
        }
      });
    } else if (isError) {
      setErrorInfo(isError);
      // Apenas uma sessão realmente inválida aciona a recuperação. Qualquer
      // outra falha (timeout, 500, rede instável, 429) mantém a sessão e
      // mostra o painel de erro com retry.
      //
      // Antes, qualquer erro sem cache no sessionStorage chamava signOut() —
      // que limpa cookies e cache e voltava para a home, que redirecionava ao
      // Strava. Com erro persistente (ex.: rate limit) isso se repetia
      // indefinidamente e destruía o próprio cache que permitiria a
      // recuperação elegante. Hoje o 401 significa exatamente "não há sessão
      // no servidor", então tentar o OAuth é uma recuperação real — mas
      // limitada a uma tentativa, justamente para não reabrir aquele loop.
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

  // D14: banner warning de código não reconhecido — visível só com gear e
  // atividades e enquanto houver caso não dispensado; o ✕ dispensa os
  // casos de agora (Set por activityId:word) e um caso novo reabre.
  const unrecognizedCaseKey = (code: UnrecognizedCode) =>
    `${code.activityId}:${code.word}`;
  const hasVisibleUnrecognizedCode = unrecognizedCodes.some(
    (code) => !dismissedCases.has(unrecognizedCaseKey(code)),
  );
  const dismissUnrecognizedCodes = () => {
    setDismissedCases((previous) => {
      const next = new Set(previous);
      unrecognizedCodes.forEach((code) =>
        next.add(unrecognizedCaseKey(code)),
      );
      return next;
    });
  };

  return (
    <div className={styles.statsContainer}>
      <main>
        {/* Falha com dados em cache: o conteúdo continua na tela e o aviso
            aparece acima dele. Antes um 429 que chegava depois da primeira
            leitura bem-sucedida não gerava mensagem alguma — o caso exato do
            A3. */}
        {isError && dashboard && getHttpStatus(isError) !== 401 && (
          <div className={styles.errorBanner}>
            <ErroMsg error={isError} onRetry={() => mutate()} />
          </div>
        )}

        {/* D14: código não reconhecido na observação privada — banner
            warning acima de tudo (renderiza mesmo sem cards registrados).
            Link só na data; frases empilhadas; bike identificada pelo nome. */}
        {hasGear &&
          hasActivities &&
          unrecognizedCodes.length > 0 &&
          hasVisibleUnrecognizedCode && (
            <div className={styles.codesWarningBanner}>
              <MdWarningAmber
                size={22}
                className={styles.codesWarningIcon}
                aria-hidden='true'
                focusable='false'
              />
              <div
                className={styles.codesWarningList}
                role='status'
                aria-live='polite'
              >
                {unrecognizedCodes
                  .filter(
                    (code) => !dismissedCases.has(unrecognizedCaseKey(code)),
                  )
                  .map((code) => (
                    <p key={unrecognizedCaseKey(code)}>
                      Há um código não reconhecido na observação privada da
                      atividade de {code.gearName} do dia{' '}
                      <a
                        href={`https://www.strava.com/activities/${code.activityId}`}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {format(
                          parseISO(code.startDate.replace(/Z$/, '')),
                          'dd/MM/yyyy',
                        )}
                      </a>
                      . “{code.word}” — você quis dizer “{code.suggestion}”?
                      Corrija no Strava para atualizar aqui no GearLife.
                    </p>
                  ))}
              </div>
              <button
                type='button'
                className={styles.codesWarningClose}
                aria-label='Dispensar aviso de código não reconhecido'
                onClick={dismissUnrecognizedCodes}
              >
                ✕
              </button>
            </div>
          )}

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
        ) : isError && !dashboard && getHttpStatus(isError) !== 401 ? (
          <div className={styles.errorState}>
            <ErroMsg error={isError} onRetry={() => mutate()} />
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
