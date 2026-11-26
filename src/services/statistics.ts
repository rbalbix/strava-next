import { Strava, SummaryGear } from 'strava';
import { REDIS_KEYS } from '../config';
import {
  ActivityBase,
  athleteStillExists,
  fetchStravaActivity,
  getActivities,
  processActivity,
  withActivitiesWriteLock,
} from './activity';

import { differenceInMinutes, fromUnixTime, getUnixTime } from 'date-fns';
import { apiRemoteStorage } from './api';
import redis from './redis';
import { getAthlete } from './athlete';
import { Equipment, Equipments } from './equipment';
import { GearStats, getGears, orderGearsByLastUse } from './gear';
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

/**
 * Merge do write final do recompute (design 2026-11-18, item 2).
 *
 * - `base` = releitura da chave no momento da gravação (o snapshot lido no
 *   início do voo ficava minutos velho atrás do fetch e sobrescrevia o que
 *   o webhook gravou nesse meio-tempo — lost update);
 * - `delta` = o que este recompute buscou do Strava;
 * - `startIds` = ids do snapshot inicial, para não ressuscitar atividade
 *   que o webhook deletou durante a janela (o delta pode ainda trazer a
 *   cópia antiga, buscada antes do delete);
 * - `deltaComplete` = o delta é uma busca COMPLETA (from-scratch /
 *   migração legada): nesse caso só o delta sobrevive — atividade que o
 *   Strava não devolveu mais é apagada ou está com gear inativo, e mantê-la
 *   em base-only reabriria a migração para sempre. Na busca incremental
 *   (`after=lastUpdated`), base-only é preservado: dado normal fora da
 *   janela ou escrita recente do webhook.
 *
 * Conflito por id: vence a cópia com `synced_at` mais novo (carimbo do
 * fetch; campo ausente vale 0, ou seja, a cópia antiga perde para qualquer
 * nova). Empate ou sem carimbo dos dois lados → vence o delta: no
 * rebuild/migração o delta é a fonte do `sport_type` novo.
 *
 * Resultado ordenado na ordem do delta (com as cópias vencedoras na posição
 * do delta) + base-only ao final — é a mesma ordem com que createStatistics
 * já recebia o resultado de getActivities.
 */
export function mergeForRecompute(
  base: ActivityBase[],
  delta: ActivityBase[],
  startIds: Set<number>,
  deltaComplete: boolean,
): ActivityBase[] {
  const baseById = new Map(base.map((activity) => [activity.id, activity]));
  const merged = new Map<number, ActivityBase>();

  for (const incoming of delta) {
    const existing = baseById.get(incoming.id);
    if (!existing) {
      // Estava no snapshot inicial e sumiu da base → deletada durante a
      // janela — não ressuscitar.
      if (startIds.has(incoming.id)) continue;
      merged.set(incoming.id, incoming);
      continue;
    }
    const baseStamp = existing.synced_at ?? 0;
    const incomingStamp = incoming.synced_at ?? 0;
    merged.set(incoming.id, incomingStamp >= baseStamp ? incoming : existing);
  }

  if (!deltaComplete) {
    for (const existing of base) {
      if (!merged.has(existing.id)) merged.set(existing.id, existing);
    }
  }

  return Array.from(merged.values());
}

/**
 * Radar da janela residual do merge (design 2026-11-18, decisão 2.7): quando
 * a releitura (base) difere do snapshot inicial, uma escrita do webhook
 * chegou no meio do voo — loga o resumo `{added, keptFromBase, deltaWins,
 * removed}`. É a evidência que diz se a janela (ms, sob lock) algum dia
 * aconteceu; sem divergência, silêncio.
 *
 * Os contadores usam identidade de referência: `mergeForRecompute` guarda no
 * resultado os próprios objetos de base/delta, então `winner === fromBase`
 * distingue quem venceu sem re-comparar conteúdo.
 */
function logMergeDivergence(
  log: ReturnType<typeof getLogger>,
  athleteId: number,
  snapshot: ActivityBase[],
  base: ActivityBase[],
  delta: ActivityBase[],
  merged: ActivityBase[],
): void {
  if (JSON.stringify(base) === JSON.stringify(snapshot)) return; // sem escrita concorrente

  const snapshotIds = new Set(snapshot.map((activity) => activity.id));
  const baseById = new Map(base.map((activity) => [activity.id, activity]));
  const deltaById = new Map(delta.map((activity) => [activity.id, activity]));
  const mergedIds = new Set(merged.map((activity) => activity.id));

  let added = 0;
  let keptFromBase = 0;
  let deltaWins = 0;
  for (const winner of merged) {
    if (!snapshotIds.has(winner.id)) added += 1;
    const fromBase = baseById.get(winner.id);
    if (fromBase && winner === fromBase) {
      keptFromBase += 1; // só na base (ou conflito ganho pela base)
    } else if (fromBase && deltaById.get(winner.id) === winner) {
      deltaWins += 1; // conflito ganho pelo delta (synced_at mais novo)
    }
  }
  let removed = 0;
  for (const id of snapshotIds) {
    if (!mergedIds.has(id)) removed += 1;
  }

  log.info(
    { athleteId, added, keptFromBase, deltaWins, removed },
    'Merge divergiu do snapshot inicial — escrita concorrente durante o voo',
  );
}

// ——— Single-flight de updateStatistics (design 2026-11-18, item 3) ———
//
// Dois níveis de dedupe:
// 1. Mesmo processo: Map<atleta, voo> — chamadas concorrentes compartilham
//    o MESMO promise (antes de qualquer I/O).
// 2. Outra instância: lock strava:lock:statistics:<id> (NX PX 300s) segura
//    o corpo inteiro; quem chega espera (poll 500ms, teto 30s) e, se o
//    outro voo já gravou, devolve o cache — dedupe vale mais que frescor.
//
// Sem heartbeat: o corpo inteiro (rebuild ~2min) cabe com folga no TTL de
// 300s; segurar a lock muito além disso só atrasaria um delete (que tem
// espera própria de 10s). O `del` é incondicional no finally quando a lock
// foi adquirida (precedente: refreshLock).
const statisticsFlights = new Map<number, Promise<GearStats[]>>();

const STATISTICS_LOCK_TTL_SECONDS = 300;
const STATISTICS_LOCK_POLL_MS = 500;
const STATISTICS_LOCK_MAX_WAIT_MS = 30_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type StatisticsFlightEntry =
  | { kind: 'owned' } // adquirimos a lock — corpo roda sob ela
  | { kind: 'lockless' } // sem lock (Redis fora / teto sem cache)
  | { kind: 'returned'; statistics: GearStats[] }; // devolve cache, sem computar

type StatisticsSnapshot = { lastUpdated: number; statistics: GearStats[] };

export async function updateStatistics(
  strava: Strava,
  athleteId: number,
): Promise<GearStats[]> {
  const inFlight = statisticsFlights.get(athleteId);
  if (inFlight) {
    getLogger().debug(
      { athleteId },
      'Single-flight: aguardando voo de estatísticas em andamento',
    );
    return inFlight;
  }

  const flight = runStatisticsFlight(strava, athleteId);
  statisticsFlights.set(athleteId, flight);
  try {
    return await flight;
  } finally {
    // Só quem criou o voo limpa o Map — quem chegou depois apenas aguarda
    // o mesmo promise e retorna sem tocar no registro.
    statisticsFlights.delete(athleteId);
  }
}

async function runStatisticsFlight(
  strava: Strava,
  athleteId: number,
): Promise<GearStats[]> {
  const entry = await enterStatisticsFlight(athleteId);
  if (entry.kind === 'returned') return entry.statistics;

  try {
    return await computeStatistics(strava, athleteId);
  } finally {
    if (entry.kind === 'owned') {
      try {
        await redis.del(REDIS_KEYS.statisticsLock(athleteId));
      } catch (error) {
        getLogger().error(
          { err: error, athleteId },
          'Erro ao liberar lock de statistics',
        );
      }
    }
  }
}

/**
 * Entra no voo de estatísticas do atleta (o dedupe no processo já aconteceu
 * no Map antes disto).
 *
 * - lock livre → `owned`;
 * - lock ocupada → espera até 30s: o outro voo gravou (devolve o cache,
 *   stale-serve) ou liberou (assume a execução);
 * - teto estourado → devolve o cache existente (stale-ok) ou, sem cache
 *   (1ª sincronização), calcula `lockless` com warn;
 * - erro de Redis → `lockless` na hora: sem I/O não há o que esperar (o
 *   corpo falharia do mesmo jeito nas leituras dele).
 */
async function enterStatisticsFlight(
  athleteId: number,
): Promise<StatisticsFlightEntry> {
  const log = getLogger();
  const lockKey = REDIS_KEYS.statisticsLock(athleteId);
  const startedAt = Date.now();

  const first = await tryAcquireStatisticsLock(lockKey);
  if (first === 'ok') return { kind: 'owned' };
  if (first === 'error') return { kind: 'lockless' };

  while (Date.now() - startedAt < STATISTICS_LOCK_MAX_WAIT_MS) {
    await sleep(STATISTICS_LOCK_POLL_MS);

    const fresh = await readFreshStatistics(athleteId, startedAt);
    if (fresh) {
      log.info(
        { athleteId },
        'Single-flight: voo em outra instância já gravou — devolvendo cache',
      );
      return { kind: 'returned', statistics: fresh };
    }

    const again = await tryAcquireStatisticsLock(lockKey);
    if (again === 'ok') return { kind: 'owned' };
    if (again === 'error') return { kind: 'lockless' };
  }

  // Teto de espera estourado (chamada do design): dedupe vale mais que
  // frescor — devolve o cache que existir (stale-ok).
  const cached = await readStatisticsSnapshot(athleteId);
  if (cached) {
    log.warn(
      { athleteId, waitedMs: STATISTICS_LOCK_MAX_WAIT_MS },
      'Single-flight: lock ocupada além do teto — devolvendo cache existente (stale-ok)',
    );
    return { kind: 'returned', statistics: cached.statistics };
  }

  // 1ª sincronização: sem cache não há o que devolver — tenta mais uma vez
  // e, ocupado, calcula sem lock (comportamento de antes do single-flight).
  const lastChance = await tryAcquireStatisticsLock(lockKey);
  if (lastChance === 'ok') return { kind: 'owned' };
  log.warn(
    { athleteId },
    'Single-flight: lock ocupada e sem cache — calculando sem lock',
  );
  return { kind: 'lockless' };
}

async function tryAcquireStatisticsLock(
  lockKey: string,
): Promise<'ok' | 'busy' | 'error'> {
  try {
    const acquired = await redis.set(lockKey, '1', {
      nx: true,
      ex: STATISTICS_LOCK_TTL_SECONDS,
    });
    return acquired ? 'ok' : 'busy';
  } catch (error) {
    getLogger().warn(
      { err: error },
      'Falha ao adquirir lock de statistics — seguindo sem lock',
    );
    return 'error';
  }
}

async function readStatisticsSnapshot(
  athleteId: number,
): Promise<StatisticsSnapshot | null> {
  try {
    const res = await apiRemoteStorage.get(REDIS_KEYS.statistics(athleteId));
    const data = res?.data as Partial<StatisticsSnapshot> | string | null;
    if (
      data &&
      typeof data === 'object' &&
      typeof data.lastUpdated === 'number' &&
      Array.isArray(data.statistics)
    ) {
      return { lastUpdated: data.lastUpdated, statistics: data.statistics };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * O outro voo gravou desde a nossa chegada? `lastUpdated` é época (s) do
 * write; compara com o segundo de chegada (o floor perdoa a sub-segundo em
 * que o voo anterior começou).
 */
async function readFreshStatistics(
  athleteId: number,
  sinceMs: number,
): Promise<GearStats[] | null> {
  const snapshot = await readStatisticsSnapshot(athleteId);
  if (!snapshot) return null;
  return snapshot.lastUpdated >= Math.floor(sinceMs / 1000)
    ? snapshot.statistics
    : null;
}

async function computeStatistics(
  strava: Strava,
  athleteId: number,
): Promise<GearStats[]> {
  const log = getLogger();
  try {
    // Duas leituras independentes do mesmo storage — em paralelo: uma não
    // usa o resultado da outra (async-parallel).
    const [storedActivitiesResult, storedStatistics] = await Promise.all([
      apiRemoteStorage.get(REDIS_KEYS.activities(athleteId)),
      apiRemoteStorage.get(REDIS_KEYS.statistics(athleteId)),
    ]);
    let storedActivities = storedActivitiesResult;

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
      // Disparado sem await (async-defer-await): o resultado não entra na
      // resposta e segurar o retorno do caminho de cache custava 2+ idas ao
      // Redis (e, havendo caso pendente, uma ao Strava) antes do dashboard
      // responder. A função engole os próprios erros — nunca rejeita.
      void backfillUnrecognizedCodes(
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
      const athlete = await getAthlete(strava, athleteId);
      const gears = getGears(athlete);
      let deltaActivities: ActivityBase[] = [];
      // O delta é uma busca completa (from-scratch / migração) ou só o
      // recorte desde `lastUpdated`? Define se o base-only entra no merge.
      let deltaComplete = true;

      if (
        !storedActivities.data ||
        storedActivities.data === null ||
        storedActivities.data === undefined ||
        Object.keys(storedActivities.data).length === 0
      ) {
        // Recupera todas as atividades
        deltaActivities = await getActivities(strava, gears, null, null);
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
          deltaActivities = await getActivities(strava, gears, null, null);
        } else {
          deltaActivities = await getActivities(strava, gears, null, lastUpdated);
          deltaComplete = false;
        }
      }

      // Ids do snapshot inicial: o delta pode trazer uma cópia que já foi
      // deletada pelo webhook no meio da janela (só-del no delta e na
      // base→fora, mas presente no startIds).
      const snapshotActivities: ActivityBase[] =
        storedActivities.data?.activities ?? [];
      const startIds = new Set<number>(
        snapshotActivities.map((activity: ActivityBase) => activity.id),
      );

      // Gravação merge-safe (design 2026-11-18, item 2): dentro do lock de
      // activities, relê a base, mescla com o delta e grava — escrita do
      // webhook do meio-tempo não é sobrescrito (nem apaga a nossa).
      const mergedActivities = await withActivitiesWriteLock(
        athleteId,
        (current) => {
          const merged = mergeForRecompute(
            current,
            deltaActivities,
            startIds,
            deltaComplete,
          );
          // Radar da janela residual (design, decisão 2.7): se a releitura
          // divergiu do snapshot, uma escrita concorrente chegou no meio
          // do voo — loga o resumo do merge como evidência.
          logMergeDivergence(
            log,
            athleteId,
            snapshotActivities,
            current,
            deltaActivities,
            merged,
          );
          return merged;
        },
      );

      if (mergedActivities === null) {
        // Atleta deletado no meio do voo (guarda LGPD): nada a gravar nem
        // estatísticas a calcular.
        log.warn({ athleteId }, 'Recompute abortado — atleta sem auth');
        return [];
      }

      log.info(
        { athleteId, activitiesCount: mergedActivities.length },
        'Persisting activities before statistics processing',
      );
      const updatedStatistics = await processStatistics(
        strava,
        athleteId,
        mergedActivities,
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
    // LGPD (design 2026-11-18, item 4): delete do atleta no meio → não
    // recriar a chave unrecognized-codes para um dado que deve sumir.
    if (!(await athleteStillExists(athleteId))) {
      log.info(
        { athleteId },
        'Backfill de unrecognized-codes ignorado — atleta sem auth (delete em andamento)',
      );
      return;
    }

    const existing = await getUnrecognizedCodes(athleteId);
    if (existing !== null) return; // já existe (mesmo []) — não repete

    const cases = findUnresolvedCases(activities);
    const codes =
      cases.length > 0
        ? toUnrecognizedCodes(
            cases,
            getGears(await getAthlete(strava, athleteId)),
          )
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

  // LGPD (design 2026-11-18, item 4): o delete do atleta pode ter rodado
  // durante o voo — sem a auth não há mais o que processar nem gravar
  // (recriar a chave statistics ressuscitaria o dado apagado).
  if (!(await athleteStillExists(athleteId))) {
    log.info(
      { athleteId },
      'Statistics ignorada — atleta sem auth (delete em andamento)',
    );
    return [];
  }

  const athlete = await getAthlete(strava, athleteId);
  const gears = getGears(athlete);
  // D15: relatório salvo já sai ordenado por uso recente dentro de cada
  // grupo (bikes primeiro, demais gears depois).
  const orderedGears = orderGearsByLastUse(
    athlete.bikes,
    athlete.shoes,
    updatedActivities,
  );

  const updatedStatistics = createStatistics(updatedActivities, orderedGears);
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

                // When pair of lights, only rear or front does not matter.
                // (emenda do ADR 0001, 2026-11-18 — lote Tiers 2/3)
                case Equipments.Lights.id:
                  equipmentsStatTemplate.forEach((e) => {
                    if (
                      e.id === Equipments.FrontLight.id ||
                      e.id === Equipments.RearLight.id
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

    // D15: gear sem nenhuma atividade aparece no fim do seu grupo
    // (count === 0); gear com atividade e 0 km continua de fora.
    if (distance !== 0 || count === 0) {
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
