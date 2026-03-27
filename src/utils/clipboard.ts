import { format } from 'date-fns';
import type { Equipment } from '../services/equipment';
import { locale, secondsToHms } from './format';

function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement('textarea');
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
    .catch((err) => console.error('Error copying text', err));
}

function copyEventDetailsToClipboard(
  equipment: Equipment,
  distance: number,
  movingTime: number,
) {
  const formattedDate = format(new Date(), 'dd/MM/yyyy');
  const formattedDistance = locale.format(',.2f')(distance / 1000);
  const formattedEquipmentDistance = locale.format(',.2f')(
    (equipment.distance ?? 0) / 1000,
  );
  const formattedTime = secondsToHms(movingTime);

  const text = `. ${formattedDate} - ${formattedDistance} km - ${formattedTime} h [${formattedEquipmentDistance} km]`;

  copyTextToClipboard(text);
}

export { copyEventDetailsToClipboard, copyTextToClipboard };
