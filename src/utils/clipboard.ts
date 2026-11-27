import type { Equipment } from '../services/equipment';
import { formatDate, formatNumber, secondsToHms } from './format';

/** Fallback via execCommand (P4): devolve se o navegador aceitou a cópia.
 *  Navegador sem suporte lança — o chamador trata como falha. */
function fallbackCopyTextToClipboard(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const copied = document.execCommand('copy');

  document.body.removeChild(textArea);
  return copied;
}

/**
 * Copia para a área de transferência e DEVOLVE se deu certo (P4).
 *
 * Antes o `.catch` engolia o erro (permissão negada, contexto não-seguro) e
 * o chamador mostrava "Copiado" mesmo na falha. Agora `false` chega ao
 * chamador, que decide o feedback — `execCommand` ausente ou quebrado
 * também vira `false` em vez de exceção solta.
 */
function copyTextToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) {
    try {
      return Promise.resolve(fallbackCopyTextToClipboard(text));
    } catch {
      return Promise.resolve(false);
    }
  }
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false,
  );
}

/** Monta o resumo do evento e copia — repassa o resultado da cópia (P4). */
function copyEventDetailsToClipboard(
  equipment: Equipment,
  distance: number,
  movingTime: number,
): Promise<boolean> {
  const formattedDate = formatDate(new Date());
  const formattedDistance = formatNumber(distance / 1000);
  const formattedEquipmentDistance = formatNumber(
    (equipment.distance ?? 0) / 1000,
  );
  const formattedTime = secondsToHms(movingTime);

  const text = `. ${formattedDate} - ${formattedDistance} km - ${formattedTime} h [${formattedEquipmentDistance} km]`;

  return copyTextToClipboard(text);
}

export { copyEventDetailsToClipboard, copyTextToClipboard };
