import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Equipment, Equipments } from '../services/equipment';
import {
  copyEventDetailsToClipboard,
  locale,
  secondsToHms,
} from '../services/utils';
import styles from '../styles/components/CardItem.module.css';

type Props = { equipment: Equipment; distance: number; movingTime: number };

export default function CardItem({
  equipment: e,
  distance,
  movingTime,
}: Props) {
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

  if (e.id === Equipments.Lubrification.id && equipmentDistance === 0) {
    return renderEvent('Bike lubrificada.');
  }

  if (e.id === Equipments.Clean.id && equipmentDistance === 0) {
    return renderEvent('Bike limpinha.');
  }

  if (equipmentDistance !== 0) {
    return (
      <li
        className={styles.event}
        onClick={() => copyEventDetailsToClipboard(e, distance, movingTime)}
      >
        <div className={styles.firstLine}>
          <div className={styles.dateAndCaption}>
            <div className={styles.bol}>{formattedDate}</div>
            <div className={styles.caption}>{e.caption}</div>
          </div>
          <div className={styles.timeago}>{timeAgo}</div>
        </div>

        <div className={styles.badges}>
          <div className={styles.chipbadge}>
            {`${locale.format(',.2f')(equipmentDistance / 1000)}km`}
          </div>
          <div className={styles.chipbadge}>
            {`⏱️ ${secondsToHms(equipmentMovingTime)}h`}
          </div>
        </div>

        <div className={styles.clear}></div>
      </li>
    );
  }

  return null;
}
