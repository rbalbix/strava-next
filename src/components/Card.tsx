import { MdClose, MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import styles from '../styles/components/Card.module.css';
import { Modal } from './Modal';

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Equipments } from '../services/equipment';
import { GearStats } from '../services/gear';
import { locale, secondsToHms } from '../services/utils';
import CardItem from './CardItem';

export default function Card({
  id,
  name,
  activityType,
  count,
  distance,
  movingTime,
  equipments,
}: GearStats) {
  const { handleOpenModal, handleCloseModal } = useContext(AuthContext);
  const isRide = activityType === 'Ride';
  const lub = equipments.find(({ id }) => id === Equipments.Lubrification.id);

  return (
    <div>
      <div className={styles.cardContainer} onClick={() => handleOpenModal(id)}>
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

      <Modal id={id} closeModal={handleCloseModal}>
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
                <MdClose />
              </div>
            </div>
            <section>
              <span>
                {`[${count} | 
              ${locale.format(',.2f')(distance / 1000)}km | 
              ${secondsToHms(movingTime)}h]`}
              </span>
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
      </Modal>
    </div>
  );
}
