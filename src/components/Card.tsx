import { MdClose, MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import styles from '../styles/components/Card.module.css';
import { Modal } from './Modal';

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Equipments } from '../services/equipment';
import { GearStats } from '../services/gear';
import { locale, secondsToHms } from '../services/utils';
import CardItem from './CardItem';

export default function Card(props: GearStats) {
  const { handleOpenModal, handleCloseModal } = useContext(AuthContext);

  const { id, name, activityType, count, distance, movingTime, equipments } =
    props;

  const lub = equipments.find(({ id }) => id === Equipments.Lubrification.id);

  return (
    <div>
      <div className={styles.cardContainer} onClick={() => handleOpenModal(id)}>
        <header>
          {name}
          {activityType === 'Ride' ? (
            <MdDirectionsBike className={styles.iconBike} />
          ) : (
            <MdDirectionsRun className={styles.iconRun} />
          )}
        </header>
        <main>
          <p>{`${count} atividades.`}</p>
          <p>{`${locale.format(',.2f')(distance / 1000)} km`}</p>
          <p>{`${secondsToHms(movingTime)}h`}</p>

          {activityType === 'Ride' && lub && (
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
                  {activityType === 'Ride' ? (
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
            {activityType === 'Ride' &&
              equipments.map((e, index) => {
                return (
                  <CardItem
                    equipment={e}
                    distance={distance}
                    movingTime={movingTime}
                    key={index}
                  />
                );
              })}
          </ul>
        </main>
      </Modal>
    </div>
  );
}
