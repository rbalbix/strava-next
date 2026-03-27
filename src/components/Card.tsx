import styles from '../styles/components/Card.module.css';

import { useContext } from 'react';
import {
  getActivityVisualType,
  isBikeActivityType,
  renderActivityIcon,
} from './activity-type-visual';
import { AuthContext } from '../contexts/AuthContext';
import { Equipments } from '../services/equipment';
import type { GearStats } from '../services/gear';
import { locale, secondsToHms } from '../utils/format';

export default function Card({
  id,
  name,
  activityType,
  count,
  distance,
  movingTime,
  equipments,
}: GearStats) {
  const { openModal } = useContext(AuthContext);
  const visualType = getActivityVisualType(activityType);
  const isBikeActivity = isBikeActivityType(activityType);
  const lub = equipments.find(({ id }) => id === Equipments.Lubrification.id);
  const lubDistance = lub?.distance ?? 0;
  const lubMovingTime = lub?.movingTime ?? 0;

  const handleCardClick = () => {
    openModal('card-detail', {
      id,
      name,
      activityType,
      count,
      distance,
      movingTime,
      equipments,
    });
  };

  return (
    <button
      type='button'
      className={styles.cardContainer}
      onClick={handleCardClick}
      aria-label={`Abrir detalhes de ${name}`}
    >
      <header>
        {name}
        {renderActivityIcon(
          visualType,
          visualType === 'run'
            ? styles.iconRun
            : visualType === 'mountain-bike'
              ? styles.iconMountainBike
              : styles.iconBike,
        )}
      </header>
      <main>
        <p>{`${count} atividades.`}</p>
        <p>{`${locale.format(',.2f')(distance / 1000)} km`}</p>
        <p>{`${secondsToHms(movingTime)}h`}</p>

        {isBikeActivity && lub && (
          <div>
            {lubDistance !== 0 ? (
              <p>{`. lubrificada a: ${locale.format(',.2f')(
                lubDistance / 1000
              )} km  | ${secondsToHms(lubMovingTime)}h`}</p>
            ) : (
              <p>Bike lubrificada. &#x1F44F;</p>
            )}
          </div>
        )}
      </main>
    </button>
  );
}
