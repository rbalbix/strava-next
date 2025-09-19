import { MdClose, MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import { GearStats } from '../services/gear';
import { locale, secondsToHms } from '../services/utils';
import styles from '../styles/components/CardDetailModal.module.css';
import CardItem from './CardItem';
import StatCard from './StatCard';

interface CardDetailModalProps {
  gearStat: GearStats;
  onClose: () => void;
}

export default function CardDetailModal({
  gearStat,
  onClose,
}: CardDetailModalProps) {
  const { name, activityType, count, distance, movingTime, equipments } =
    gearStat;
  const isRide = activityType === 'Ride';

  return (
    <div className={styles.cardDetailModalContainer}>
      <main>
        <header>
          <div>
            <div>
              <span>
                {isRide ? (
                  <MdDirectionsBike color='var(--light-blue)' />
                ) : (
                  <MdDirectionsRun color='var(--orange-strava)' />
                )}
              </span>
              <span>{name}</span>
            </div>
            <div>
              <MdClose onClick={onClose} style={{ cursor: 'pointer' }} />
            </div>
          </div>
          <section>
            {/* <span>
              {`[${count} | 
              ${locale.format(',.2f')(distance / 1000)}km | 
              ${secondsToHms(movingTime)}h]`}
            </span> */}
            <div className={styles.statCardContainer}>
              <StatCard value={count} label='Atividades' icon='📊' />
              <StatCard
                value={`${locale.format(',.2f')(distance / 1000)}km`}
                label='Distância Total'
                icon='📍'
              />
              <StatCard
                value={`${secondsToHms(movingTime)}h`}
                label='Tempo Total'
                icon='⏱️'
              />
            </div>
          </section>
        </header>
        <ul className={styles.timeline}>
          {isRide &&
            equipments.map((e) => (
              <CardItem
                key={e.id}
                equipment={e}
                distance={distance}
                movingTime={movingTime}
              />
            ))}
        </ul>
      </main>
    </div>
  );
}
