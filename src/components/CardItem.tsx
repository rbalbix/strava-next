import { format } from 'date-fns';
import { Equipment } from '../services/gear';
import { locale, secondsToHms } from '../services/utils';
import styles from '../styles/components/CardItem.module.css';

type Props = { equipment: Equipment };

export default function CardItem(props: Props) {
  const { equipment: e } = props;

  if (e.id === 'lub' && e.distance === 0) {
    return (
      <div className={styles.cardItemContainer}>
        <span>{`[${format(new Date(e.date), 'dd/MM/yyyy')}]`}</span>
        <span>Bike lubrificada. &#x1F44F;</span>
      </div>
    );
  } else if (e.id === 'clean' && e.distance === 0) {
    return (
      <div className={styles.cardItemContainer}>
        <span>{`[${format(new Date(e.date), 'dd/MM/yyyy')}]`}</span>
        <span>Bike limpinha. &#x1F44F;</span>
      </div>
    );
  } else {
    return (
      <div key={e.id} className={styles.cardItemContainer}>
        <span>{`[${format(new Date(e.date), 'dd/MM/yyyy')}]`}</span>
        <span>{`${e.caption}`}</span>
        <span>{`${locale.format(',.2f')(e.distance / 1000)}km`}</span>
        <span>|</span>
        <span>{`${secondsToHms(e.movingTime)}h`}</span>
      </div>
    );
  }
}
