import * as d3 from 'd3-format';
import { format } from 'date-fns';
import { ActivityBase } from './activity';
import { apiRemoteStorage } from './api';
import { Equipment } from './equipment';
import { GearStats } from './gear';

export type LocalActivity = {
  lastUpdated: number;
  activities: ActivityBase[];
};

export interface RemoteStorageResponse {
  success: boolean;
  data?: LocalActivity;
  error?: string;
  timestamp: Date;
}

const locale = d3.formatLocale({
  decimal: ',',
  thousands: '.',
  grouping: [3],
  currency: ['R$', ''],
});

function secondsToHms(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0'
  )}`;
}

function saveLocalStat(value: LocalActivity) {
  localStorage.setItem('local-stat', JSON.stringify(value));
}

async function saveRemote(
  key: string,
  value: any
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
          10000
        )
      ),
    ]);

    // Verifica se a resposta é bem-sucedida
    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ ${key} salvo com sucesso`);
      return {
        success: true,
        data: value,
        timestamp: new Date(),
      };
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (error) {
    console.error(`❌ Erro ao salvar ${key}:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date(),
    };
  }
}

function fallbackCopyTextToClipboard(text: string) {
  var textArea = document.createElement('textarea');
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  document.execCommand('copy');

  document.body.removeChild(textArea);
}

function copyTextToClipboard(text: string) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => {
      return;
    })
    .catch((err) => console.error('Erro ao copiar:', err));
}

function copyEventDetailsToClipboard(
  equipment: Equipment,
  distance: number,
  movingTime: number
) {
  const formattedDate = format(new Date(), 'dd/MM/yyyy');
  const formattedDistance = locale.format(',.2f')(distance / 1000);
  const formattedEquipmentDistance = locale.format(',.2f')(
    equipment.distance / 1000
  );
  const formattedTime = secondsToHms(movingTime);

  const text = `. ${formattedDate} - ${formattedDistance} km - ${formattedTime} h [${formattedEquipmentDistance} km]`;

  copyTextToClipboard(text);
}

function updateActivityInArray(
  updatedActivity: Partial<ActivityBase>,
  activities: ActivityBase[]
): ActivityBase[] {
  return activities.map((activity) =>
    activity.id === updatedActivity.id
      ? { ...activity, ...safeActivityParse(updatedActivity) }
      : activity
  );
}

function safeActivityParse(data: any): ActivityBase {
  return {
    id: data.id ?? 0,
    name: data.name ?? '',
    distance: data.distance ?? 0,
    moving_time: data.moving_time ?? 0,
    type: data.type ?? '',
    start_date_local: data.start_date_local ?? '',
    gear_id: data.gear_id,
    private_note: data.private_note,
  };
}

function mergeGearStats(
  previous: GearStats[],
  incoming: GearStats[]
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
  copyEventDetailsToClipboard,
  copyTextToClipboard,
  locale,
  mergeGearStats,
  saveLocalStat,
  saveRemote,
  secondsToHms,
  updateActivityInArray,
};
