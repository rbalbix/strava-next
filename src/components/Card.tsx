import { MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import styles from '../styles/components/Card.module.css';

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Equipments } from '../services/equipment';
import { GearStats } from '../services/gear';
import { locale, secondsToHms } from '../services/utils';

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
  const isRide = activityType === 'Ride';
  const lub = equipments.find(({ id }) => id === Equipments.Lubrification.id);

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
    <div className={styles.cardContainer} onClick={handleCardClick}>
      <header>
        {name}
        {isRide ? (
          <MdDirectionsBike className={styles.iconBike} />
        ) : (
          <MdDirectionsRun className={styles.iconRun} />
        )}
      </header>
      <main>
        <p>{`${count} atividades.`}</p>
        <p>{`${locale.format(',.2f')(distance / 1000)} km`}</p>
        <p>{`${secondsToHms(movingTime)}h`}</p>

        {isRide && lub && (
          <div>
            {lub.distance != 0 ? (
              <p>{`. lubrificada a: ${locale.format(',.2f')(
                lub.distance / 1000
              )} km  | ${secondsToHms(lub.movingTime)}h`}</p>
            ) : (
              <p>Bike lubrificada. &#x1F44F;</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
