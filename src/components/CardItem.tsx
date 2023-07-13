import { format } from 'date-fns';
import { Equipment } from '../services/gear';
import { copyTextToClipboard, locale, secondsToHms } from '../services/utils';
import styles from '../styles/components/CardItem.module.css';
import { Equipments } from '../services/equipment';

type Props = { equipment: Equipment; distance: number; movingTime: number };

export default function CardItem(props: Props) {
  const { equipment: e, distance, movingTime } = props;

  if (e.id === Equipments.Lubrification.id && e.distance === 0) {
    return (
      <div className={styles.cardItemContainer}>
        <span>{`[${format(new Date(e.date), 'dd/MM/yyyy')}]`}</span>
        <span>Bike lubrificada. &#x1F44F;</span>
      </div>
    );
  } else if (e.id === Equipments.Clean.id && e.distance === 0) {
    return (
      <div className={styles.cardItemContainer}>
        <span>{`[${format(new Date(e.date), 'dd/MM/yyyy')}]`}</span>
        <span>Bike limpinha. &#x1F44F;</span>
      </div>
    );
  } else {
    if (e.distance !== 0) {
      return (
        <div
          key={e.id}
          className={styles.cardItemContainer}
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
          <span>{`[${format(new Date(e.date), 'dd/MM/yyyy')}]`}</span>
          <span>{`${e.caption}`}</span>
          <span>{`${locale.format(',.2f')(e.distance / 1000)}km`}</span>
          <span>|</span>
          <span>{`${secondsToHms(e.movingTime)}h`}</span>
        </div>
      );
    }
  }
}
