import * as d3 from 'd3-format';
import { ActivityBase } from './activity';
import { format } from 'date-fns';
import { Equipment } from './equipment';

export type LocalActivity = {
  lastUpdated: number;
  activities: ActivityBase[];
};

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
  copyTextToClipboard,
  copyEventDetailsToClipboard,
};
