import { MdClose } from 'react-icons/md';
import { GearStats } from '../services/gear';
import { locale, secondsToHms } from '../services/utils';
import styles from '../styles/components/CardDetailModal.module.css';
import CardItem from './CardItem';
import StatCard from './StatCard';
import {
  getActivityVisualType,
  isBikeActivityType,
  renderActivityIcon,
} from './activity-type-visual';

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
  const visualType = getActivityVisualType(activityType);
  const isBikeActivity = isBikeActivityType(activityType);

  return (
    <div className={styles.cardDetailModalContainer}>
      <main>
        <header>
          <div>
            <div>
              <span>
                {renderActivityIcon(
                  visualType,
                  undefined,
                  visualType === 'run'
                    ? 'var(--orange-strava)'
                    : visualType === 'mountain-bike'
                      ? '#2e7d32'
                      : 'var(--light-blue)',
                )}
              </span>
              <h2 id='modal-title-card-detail' className={styles.modalTitle}>
                {name}
              </h2>
            </div>
            <div>
              <button
                type='button'
                onClick={onClose}
                className={styles.closeButton}
                aria-label='Fechar detalhes'
              >
                <MdClose />
              </button>
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
          {isBikeActivity &&
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
