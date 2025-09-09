import { format, formatDistanceToNow, parseISO } from 'date-fns';
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

  const localDate = parseISO(e.date.replace(/Z$/, ''));
  const formattedDate = format(localDate, 'dd/MM/yyyy');
  const timeAgo = formatDistanceToNow(localDate, { locale: ptBR });

  const renderEvent = (message: string) => (
    <li className={styles.event}>
      <div className={styles.bol}>{formattedDate}</div>
      <div className={styles.txt}>
        <span className={styles.timeago}>{timeAgo}</span>
        <div className={styles.textCont}>{message} &#x1F44F;</div>
        <div className={styles.clear}></div>
      </div>
    </li>
  );

  if (e.id === Equipments.Lubrification.id && e.distance === 0) {
    return renderEvent('Bike lubrificada.');
  }

  if (e.id === Equipments.Clean.id && e.distance === 0) {
    return renderEvent('Bike limpinha.');
  }

  if (e.distance !== 0) {
    return (
      <li
        className={styles.event}
        onClick={() => copyEventDetailsToClipboard(e, distance, movingTime)}
      >
        <div className={styles.bol}>{formattedDate}</div>
        <div className={styles.txt}>
          <span className={styles.timeago}>{timeAgo}</span>
          <div className={styles.textCont}>
            {`${e.caption} ${locale.format(',.2f')(
              e.distance / 1000
            )}km [${secondsToHms(e.movingTime)}h]`}
          </div>
          <div className={styles.clear}></div>
        </div>
      </li>
    );
  }

  return null;
}
