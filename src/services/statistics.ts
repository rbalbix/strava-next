import { Strava, SummaryGear } from 'strava';
import { REDIS_KEYS } from '../config';
import {
  ActivityBase,
  fetchStravaActivity,
  getActivities,
  processActivity,
  processActivities,
} from './activity';

import { differenceInMinutes, fromUnixTime, getUnixTime } from 'date-fns';
import { apiRemoteStorage } from './api';
import { getAthlete } from './athlete';
import { Equipment, Equipments } from './equipment';
import { GearStats, getGears } from './gear';
import { saveRemote } from './utils';
import { getLogger } from './logger';
import { ActivitySportType } from './strava-sdk';
import {
  equipmentMatches,
  findUnresolvedCases,
  normalizeNote,
  toUnrecognizedCodes,
  tokenizeNote,
} from './noteCodes';
import {
  getStoredUnrecognizedCodes,
  getUnrecognizedCodes,
  recordRefreshAttempt,
  saveUnrecognizedCodes,
} from './unrecognized-codes';

// D14.1 — intervalo mínimo entre tentativas de auto-refresh do relatório
// (10 min): por atleta com banner ativo, ~1 chamada Strava a cada 10 min
// por caso reportado (limite do Strava: 300/15 min).
const REPORT_REFRESH_MIN_INTERVAL_SECONDS = 600;

export async function updateStatistics(
  strava: Strava,
  athleteId: number,
): Promise<GearStats[]> {
  const log = getLogger();
  try {
    let storedActivities = await apiRemoteStorage.get(
      REDIS_KEYS.activities(athleteId),
    );

    const storedStatistics = await apiRemoteStorage.get(
      REDIS_KEYS.statistics(athleteId),
    );

    // D14.1: auto-refresh antes da decisão cache/recálculo — editar só a
    // observação privada no Strava não dispara webhook, então sem isto o
    // banner nunca some depois da correção. Havendo casos e passado o
    // throttle, rebusca SOMENTE as atividades reportadas (best-effort).
    const refreshed = await refreshReportedActivities(
      strava,
      athleteId,
      storedActivities?.data?.activities ?? [],
    );
    if (refreshed) {
      // O refresh gravou via processActivity — relê o cache uma única vez:
      // o snapshot antigo seria mesclado por cima no recompute e
      // sobrescreveria a correção.
      storedActivities = await apiRemoteStorage.get(
        REDIS_KEYS.activities(athleteId),
      );
    }

    if (
      !refreshed &&
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
      log.debug({ athleteId }, 'Using cached statistics');
      // D14: backfill best-effort — o relatório de códigos não reconhecidos
      // é gravado uma vez por atleta no primeiro load com cache válido
      // (senão o banner só apareceria após o próximo evento do Strava).
      await backfillUnrecognizedCodes(
        strava,
        athleteId,
        storedActivities.data.activities,
      );
      return storedStatistics.data.statistics;
    } else {
      log.info(
        { athleteId },
        refreshed
          ? 'Recomputing statistics (report refreshed)'
          : 'Recomputing statistics',
      );
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
        const hasLegacyActivities =
          Array.isArray(activities) &&
          activities.some(
            (activity: ActivityBase) =>
              !activity.sport_type &&
              typeof activity.type === 'string' &&
              activity.type.length > 0,
          );

        if (hasLegacyActivities) {
          // One-time migration path:
          // rebuild from Strava API so cached activities include sport_type
          log.info(
            { athleteId },
            'Legacy activities detected without sport_type; rebuilding activities cache',
          );
          activitiesToNewStatistics = await getActivities(
            strava,
            gears,
            null,
            null,
          );
        } else {
          const activitiesFromStravaAPI = await getActivities(
            strava,
            gears,
            null,
            lastUpdated,
          );
          activitiesToNewStatistics = [...activitiesFromStravaAPI, ...activities];
        }
      }

      log.info(
        { athleteId, activitiesCount: activitiesToNewStatistics.length },
        'Persisting activities before statistics processing',
      );
      await processActivities(athleteId, activitiesToNewStatistics);
      const updatedStatistics = await processStatistics(
        strava,
        athleteId,
        activitiesToNewStatistics,
      );
      return updatedStatistics;
    }
  } catch (error) {
    log.error({ err: error, athleteId }, 'Failed to update statistics');
    throw error;
  }
}

/**
 * D14 — backfill do relatório no caminho de cache (best-effort: nunca
 * derruba o retorno das estatísticas). Só grava se a chave ainda não
 * existir; a varredura é pura (só atividades) e a chamada ao Strava para
 * nomear os gears só acontece quando há caso a reportar.
 */
async function backfillUnrecognizedCodes(
  strava: Strava,
  athleteId: number,
  activities: ActivityBase[],
): Promise<void> {
  const log = getLogger();
  try {
    const existing = await getUnrecognizedCodes(athleteId);
    if (existing !== null) return; // já existe (mesmo []) — não repete

    const cases = findUnresolvedCases(activities);
    const codes =
      cases.length > 0
        ? toUnrecognizedCodes(cases, getGears(await getAthlete(strava)))
        : [];

    await saveUnrecognizedCodes(athleteId, codes);
    log.debug(
      { athleteId, codesCount: codes.length },
      'Backfilled unrecognized codes report',
    );
  } catch (error) {
    log.warn(
      { err: error, athleteId },
      'Failed to backfill unrecognized codes report',
    );
  }
}

/**
 * D14.1 — auto-refresh do relatório (caminho B, design aprovado): como
 * editar só a observação privada no Strava não dispara webhook, isto
 * rebusca as atividades reportadas para o banner sumir depois da correção
 * ("Corrija no Strava para atualizar aqui no GearLife"). Havendo casos e
 * passado o throttle, faz 1 `fetchStravaActivity` por caso e grava via
 * `processActivity` só o que mudou. Best-effort absoluto: qualquer falha
 * vira `log.warn` e devolve `false` — nunca derruba o dashboard.
 *
 * Retorna `true` quando algo mudou: o chamador força o recálculo (sem
 * isso, o fast path com timestamps no mesmo minuto engoliria a mudança).
 */
async function refreshReportedActivities(
  strava: Strava,
  athleteId: number,
  activities: ActivityBase[],
): Promise<boolean> {
  const log = getLogger();
  try {
    if (activities.length === 0) return false;

    const report = await getStoredUnrecognizedCodes(athleteId);
    if (!report || report.codes.length === 0) return false;

    const now = Math.floor(Date.now() / 1000);
    if (
      report.lastRefreshAttempt !== undefined &&
      now - report.lastRefreshAttempt < REPORT_REFRESH_MIN_INTERVAL_SECONDS
    ) {
      return false; // throttle — nenhuma chamada ao Strava
    }

    // Grava a tentativa ANTES dos fetches: o throttle vale mesmo se a
    // tentativa falhar no meio (evita martelar o Strava a cada poll).
    try {
      await recordRefreshAttempt(athleteId, report);
    } catch (error) {
      log.warn(
        { err: error, athleteId },
        'Failed to record report refresh attempt',
      );
    }

    const storedById = new Map<number, ActivityBase>(
      activities.map((activity) => [activity.id, activity]),
    );
    // Dedupe por atividade (revisão pré-PR, item 1): uma nota com duas
    // palavras reportadas busca uma vez só — sem isto, GET extra ao Strava
    // e um processActivity duplicado contra o snapshot antigo do mapa.
    const reportedActivityIds = new Set(
      report.codes.map((code) => code.activityId),
    );
    let changed = false;

    for (const activityId of reportedActivityIds) {
      const storedActivity = storedById.get(activityId);
      // Reportada fora do cache (ex.: filtro de gear): NÃO insere — senão
      // updateActivityInArray faria um prepend indevido (utils.ts:72).
      if (!storedActivity) continue;
      try {
        const detail = await fetchStravaActivity(activityId, strava);
        const noteChanged =
          (detail.private_note ?? '') !== (storedActivity.private_note ?? '');
        const nameChanged =
          (detail.name ?? '') !== (storedActivity.name ?? '');
        if (noteChanged || nameChanged) {
          // processActivity devolve null quando a gravação interna falhou —
          // só nesse caso o recompute pode ser forçado.
          const updated = await processActivity(detail, athleteId);
          if (updated) changed = true;
        }
      } catch (error) {
        log.warn(
          { err: error, athleteId, activityId },
          'Failed to refresh reported activity',
        );
      }
    }

    if (changed) {
      log.info(
        { athleteId },
        'Reported activities refreshed; forcing statistics recompute',
      );
    }
    return changed;
  } catch (error) {
    log.warn(
      { err: error, athleteId },
      'Failed to refresh reported activities',
    );
    return false;
  }
}

export async function processStatistics(
  strava: Strava,
  athleteId: number,
  updatedActivities: ActivityBase[],
): Promise<GearStats[]> {
  const log = getLogger();
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
    log.info(
      { athleteId, statsCount: updatedStatistics.length },
      `Estatística processada para ${athleteId}`,
    );
    // D14: relatório de códigos não reconhecidos — best-effort depois do
    // save das estatísticas; falha aqui não derruba o retorno.
    try {
      const codes = toUnrecognizedCodes(
        findUnresolvedCases(updatedActivities),
        gears,
      );
      await saveUnrecognizedCodes(athleteId, codes);
    } catch (error) {
      log.warn(
        { err: error, athleteId },
        'Failed to save unrecognized codes report',
      );
    }
    return updatedStatistics;
  } else {
    log.error({ athleteId, responseError: response.error }, 'Failed to save statistics');
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
    let activityType: ActivitySportType | null = null;

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
          // D14: matching tolerante — case-insensitive + sinônimos PT,
          // substring preservada (noteCodes.equipmentMatches). O guard do
          // review (palavra isolada) também mora lá.
          const normalizedNote = activity.private_note
            ? normalizeNote(activity.private_note)
            : '';
          const noteTokens = tokenizeNote(normalizedNote);
          equipments.forEach((equipment) => {
            if (equipmentMatches(normalizedNote, noteTokens, equipment.id)) {
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
              // (D14: o guard da palavra isolada — inclusive as formas PT
              // 'revisão' — passou para noteCodes.equipmentMatches.)

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
        activityType = activity.sport_type ?? activity.type;
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
