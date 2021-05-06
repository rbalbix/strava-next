import * as d3 from 'd3-format';
import { MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import styles from '../styles/components/Card.module.css';

const locale = d3.formatLocale({
  decimal: ',',
  thousands: '.',
  grouping: [3],
  currency: ['R$', ''],
});

export default function Card(props) {
  return (
    <div className={styles.cardContainer}>
      <header>
        {props.gear.name}
        {props.gear.type === 'Ride' ? (
          <MdDirectionsBike color='var(--light-blue)' />
        ) : (
          <MdDirectionsRun color='#fc5200' />
        )}
      </header>
      <main>
        <p>{`${props.gear.count} atividades.`}</p>
        <p>{`${locale.format(',.2f')(props.gear.distance / 1000)} km`}</p>
        <p>{`${secondsToHms(props.gear.totalMovingTime)}`}</p>
      </main>
    </div>
  );
}

function secondsToHms(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor((totalSeconds % 3600) % 60);

  const movingTime = `${String(hours).padStart(2, '0')}:${String(
    minutes
  ).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return movingTime;
}
