import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Equipments } from '../services/equipment';
import { Equipment } from '../services/gear';
import { copyTextToClipboard, locale, secondsToHms } from '../services/utils';
import styles from '../styles/components/CardItem.module.css';

type Props = { equipment: Equipment; distance: number; movingTime: number };

export default function CardItem(props: Props) {
  const { equipment: e, distance, movingTime } = props;

  if (e.id === Equipments.Lubrification.id && e.distance === 0) {
    return (
      <li key={e.id} className={styles.event}>
        <div className={styles.bol}>{`${format(
          new Date(e.date),
          'dd/MM/yyyy'
        )}`}</div>
        <div className={styles.txt}>
          <span className={styles.timeago}>
            {formatDistanceToNow(new Date(e.date), {
              locale: ptBR,
            })}
          </span>
          <div className={styles.textCont}>Bike lubrificada. &#x1F44F;</div>
          <div className={styles.clear}></div>
        </div>
      </li>
    );
  } else if (e.id === Equipments.Clean.id && e.distance === 0) {
    return (
      <li key={e.id} className={styles.event}>
        <div className={styles.bol}>{`${format(
          new Date(e.date),
          'dd/MM/yyyy'
        )}`}</div>
        <div className={styles.txt}>
          <span className={styles.timeago}>
            {formatDistanceToNow(new Date(e.date), {
              locale: ptBR,
            })}
          </span>
          <div className={styles.textCont}>Bike limpinha. &#x1F44F;</div>
          <div className={styles.clear}></div>
        </div>
      </li>
    );
  } else {
    if (e.distance !== 0) {
      return (
        <li
          key={e.id}
          className={styles.event}
          onClick={() =>
            copyTextToClipboard(
              `. ${format(new Date(), 'dd/MM/yyyy')} - ${locale.format(',.2f')(
                distance / 1000
              )}km - ${secondsToHms(movingTime)}h [${locale.format(',.2f')(
                e.distance / 1000
              )}km]`
            )
          }
        >
          <div className={styles.bol}>{`${format(
            new Date(e.date),
            'dd/MM/yyyy'
          )}`}</div>
          <div className={styles.txt}>
            <span className={styles.timeago}>
              {formatDistanceToNow(new Date(e.date), {
                locale: ptBR,
              })}
            </span>
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
  }
}
