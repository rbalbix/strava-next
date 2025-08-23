import * as d3 from 'd3-format';
import { ActivityBase } from './activity';
import { format } from 'date-fns';
import { Equipment } from './equipment';
import apiStorage from './apiStorage';

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
  const seconds = Math.floor((totalSeconds % 3600) % 60);

  const movingTime = `${String(hours).padStart(2, '0')}:${String(
    minutes
  ).padStart(2, '0')}`;

  return movingTime;
}

function saveLocalStat(value: LocalActivity) {
  localStorage.setItem('local-stat', JSON.stringify(value));
}

async function saveRemoteStat(
  athleteId: string,
  activity: LocalActivity
): Promise<RemoteStorageResponse> {
  try {
    // Validação de entrada
    if (!athleteId || !activity) {
      throw new Error('Dados inválidos: athleteId e activity são obrigatórios');
    }

    console.log(`🔄 Salvando atividades para athlete ${athleteId}`);

    // Chamada à API com timeout
    const response = await apiStorage.post<RemoteStorageResponse>(
      '/',
      {
        athlete: athleteId,
        value: activity,
      },
      {
        timeout: 10000, // 10 segundos timeout
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': generateRequestId(), // Para tracing
        },
      }
    );

    // Verifica se a resposta é bem-sucedida
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Atividade salva remotamente:', response.data);
      return {
        success: true,
        data: activity,
        timestamp: new Date(),
      };
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (error) {
    console.error('❌ Erro ao salvar atividade:', error);

    return {
      success: false,
      error: error,
      timestamp: new Date(),
    };
  }
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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

export {
  locale,
  secondsToHms,
  saveLocalStat,
  saveRemoteStat,
  copyTextToClipboard,
  copyEventDetailsToClipboard,
};
