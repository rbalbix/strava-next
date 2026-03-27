import type { ActivityBase } from './activity';
import { apiRemoteStorage } from './api';
import { GearStats } from './gear';
import { getLogger } from './logger';
import { getActivitySportType } from './strava-sdk';

export interface RemoteStorageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: Date;
}

async function saveRemote(
  key: string,
  value: unknown,
): Promise<RemoteStorageResponse> {
  try {
    // Validação de entrada
    if (!key?.trim() || value === undefined || value === null) {
      throw new Error('Dados inválidos: key e value são obrigatórios');
    }

    // Chamada à API com timeout
    const response = await Promise.race([
      apiRemoteStorage.post<RemoteStorageResponse>('/', { key, value }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Timeout ao salvar dados remotos')),
          10000,
        ),
      ),
    ]);

    // Verifica se a resposta é bem-sucedida
    if (response.status >= 200 && response.status < 300) {
      getLogger().info({ key }, 'Remote data saved successfully');
      return {
        success: true,
        data: value,
        timestamp: new Date(),
      };
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (error) {
    getLogger().error({ err: error, key }, 'Error saving remote data');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date(),
    };
  }
}

function updateActivityInArray(
  updatedActivity: Partial<ActivityBase>,
  activities: ActivityBase[],
): ActivityBase[] {
  // If activity exists, update it; otherwise prepend new activity
  const exists = activities.find((a) => a.id === updatedActivity.id);
  const parsed = safeActivityParse(updatedActivity);
  if (exists) {
    return activities.map((activity) =>
      activity.id === updatedActivity.id
        ? { ...activity, ...parsed }
        : activity,
    );
  }

  return [parsed, ...activities];
}

/**
 * Merge two activity arrays and deduplicate by id.
 * Preference is given to the activity with the newest `start_date_local`.
 */
function mergeActivities(
  incoming: ActivityBase[],
  existing: ActivityBase[],
): ActivityBase[] {
  const map = new Map<number, ActivityBase>();

  const add = (a: ActivityBase) => {
    const current = map.get(a.id);
    if (!current) {
      map.set(a.id, a);
      return;
    }
    // prefer the one with later start_date_local
    const curDate = new Date(current.start_date_local).getTime();
    const newDate = new Date(a.start_date_local).getTime();
    if (newDate >= curDate) map.set(a.id, a);
  };

  // add existing first, then incoming (incoming may override)
  existing.forEach(add);
  incoming.forEach(add);

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.start_date_local).getTime() -
      new Date(a.start_date_local).getTime(),
  );
}

function safeActivityParse(data: Partial<ActivityBase>): ActivityBase {
  const sportType = getActivitySportType(data);
  return {
    id: data.id ?? 0,
    name: data.name ?? '',
    distance: data.distance ?? 0,
    moving_time: data.moving_time ?? 0,
    type: sportType,
    sport_type: sportType,
    start_date_local: data.start_date_local ?? '',
    gear_id: data.gear_id ?? '',
    private_note: data.private_note ?? '',
  };
}

function mergeGearStats(
  previous: GearStats[],
  incoming: GearStats[],
): GearStats[] {
  const statsMap = new Map<string, GearStats>();

  previous.forEach((stat) => statsMap.set(stat.id, stat));

  incoming.forEach((newStat) => {
    const oldStat = statsMap.get(newStat.id);
    if (oldStat) {
      statsMap.set(newStat.id, {
        ...newStat,
        count: oldStat.count + newStat.count,
        distance: oldStat.distance + newStat.distance,
        movingTime: oldStat.movingTime + newStat.movingTime,
        equipments: [...oldStat.equipments, ...newStat.equipments],
      });
    } else {
      statsMap.set(newStat.id, newStat);
    }
  });

  return Array.from(statsMap.values());
}

export {
  mergeGearStats,
  saveRemote,
  updateActivityInArray,
  mergeActivities,
};
