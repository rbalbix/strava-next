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
import { formatNumber, secondsToHms } from '../utils/format';

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
    try {
      // Notify sidebar (if open) to close before opening modal
      window.dispatchEvent(new Event('gearlife:close-sidebar'));
    } catch (_) {}

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
      className={`${styles.cardContainer} glass-effect`}
      onClick={handleCardClick}
      aria-label={`Abrir detalhes de ${name}`}
    >
      {/* <button> só aceita conteúdo de frase: header/main/div/p viram spans
          e o Card.module.css dá display:block para o layout não mudar
          (P2/C6 — content model inválido). */}
      <span className={styles.cardHeader}>
        <span>{name}</span>
        <span>
          {renderActivityIcon(
            visualType,
            visualType === 'run'
              ? styles.iconRun
              : visualType === 'mountain-bike'
                ? styles.iconMountainBike
                : styles.iconBike,
          )}
        </span>
      </span>
      <span className={styles.cardBody}>
        <span className={styles.cardText}>{`${count} atividades.`}</span>
        <span className={styles.cardText}>
          {/* &nbsp; (P4): número e unidade não podem quebrar em linhas
              diferentes. */}
          {`${formatNumber(distance / 1000)}\u00A0km`}
        </span>
        <span className={styles.cardText}>{`${secondsToHms(movingTime)}h`}</span>

        {isBikeActivity && lub && (
          <span className={styles.cardLub}>
            {lubDistance !== 0 ? (
              <span className={styles.cardText}>
                {`. lubrificada a: ${formatNumber(lubDistance / 1000)} km  | ${secondsToHms(lubMovingTime)}h`}
              </span>
            ) : (
              <span className={styles.cardText}>
                Bike lubrificada. &#x1F44F;
              </span>
            )}
          </span>
        )}
      </span>
    </button>
  );
}
