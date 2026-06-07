import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Equipments } from '../services/equipment';
import type { Equipment } from '../services/equipment';
import { copyEventDetailsToClipboard } from '../utils/clipboard';
import { locale, secondsToHms } from '../utils/format';
import styles from '../styles/components/CardItem.module.css';
import { useToast } from '../contexts/ToastContext';

import { computeThresholdState } from '../utils/thresholds';

type Props = {
  equipment: Equipment;
  distance: number;
  movingTime: number;
  thresholdKm?: number;
  children?: React.ReactNode;
  onToggleEditor?: () => void;
  isEditorVisible?: boolean;
};

export default function CardItem({
  equipment: e,
  distance,
  movingTime,
  thresholdKm,
  children,
  onToggleEditor,
  isEditorVisible = false,
}: Props) {
  const { showToast } = useToast();
  if (!e.date) return null;
  const equipmentDistance = e.distance ?? 0;
  const equipmentMovingTime = e.movingTime ?? 0;

  const localDate = parseISO(e.date.replace(/Z$/, ''));
  const formattedDate = format(localDate, 'dd/MM/yyyy');
  const timeAgo = formatDistanceToNowStrict(localDate, {
    locale: ptBR,
  });

  const renderEvent = (message: string) => (
    <li className={styles.event}>
      <div className={styles.firstLine}>
        <div className={styles.dateAndCaption}>
          <div className={styles.bol}>{formattedDate}</div>
          <div className={styles.caption}>{message}</div>
        </div>
        <div className={styles.timeago}>{timeAgo}</div>
      </div>
      <div className={styles.badges}></div>
    </li>
  );

  const handleCardItemClick = () => {
    copyEventDetailsToClipboard(e, distance, movingTime);
    // showToast('Detalhes copiados', 'success');

    if (onToggleEditor) {
      onToggleEditor();
    }
  };

  if (e.id === Equipments.Lubrification.id && equipmentDistance === 0) {
    return renderEvent('Bike lubrificada.');
  }

  if (e.id === Equipments.Clean.id && equipmentDistance === 0) {
    return renderEvent('Bike limpinha.');
  }

  if (equipmentDistance !== 0) {
    return (
      <li className={styles.event}>
        <button
          type='button'
          className={styles.eventButton}
          onClick={handleCardItemClick}
          aria-label={`${isEditorVisible ? 'Fechar editor e' : 'Abrir editor e'} copiar detalhes de ${e.caption}`}
        >
          <div className={styles.firstLine}>
            <div className={styles.dateAndCaption}>
              <div className={styles.bol}>{formattedDate}</div>
              <div className={styles.caption}>{e.caption}</div>
            </div>
            <div className={styles.timeago}>{timeAgo}</div>
          </div>

          {/* Verifica se o valor é positivo */}
          {thresholdKm !== undefined &&
            thresholdKm !== null &&
            thresholdKm > 0 && (
              <div className={styles.progressContainer} aria-hidden>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${
                      styles[
                        computeThresholdState(
                          equipmentDistance / 1000,
                          thresholdKm,
                        )
                      ]
                    }`}
                    style={{
                      width: `${Math.min(
                        (equipmentDistance / 1000 / thresholdKm) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

          <div className={styles.badges}>
            <div className={styles.chipbadge}>
              {`${locale.format(',.2f')(equipmentDistance / 1000)}km`}
            </div>
            <div className={styles.chipbadge}>
              {`⏱️ ${secondsToHms(equipmentMovingTime)}h`}
            </div>
          </div>

          <div className={styles.clear}></div>
        </button>

        {/** Editor (children) - só aparece quando isEditorVisible é true */}
        {children}
      </li>
    );
  }

  return null;
}
