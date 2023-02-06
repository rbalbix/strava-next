import { MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import styles from '../styles/components/Card.module.css';
import { Modal } from './Modal';

import { useContext } from 'react';
import { ActivityType } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import { Equipments } from '../services/equipment';
import { GearStats } from '../services/gear';
import { locale, secondsToHms } from '../services/utils';
import CardItem from './CardItem';

export default function Card2(props: GearStats) {
  const { handleOpenModal, handleCloseModal } = useContext(AuthContext);

  const { id, name, activityType, count, distance, movingTime, equipments } =
    props;

  const lub = equipments.find(({ id }) => id === Equipments.Lubrification.id);

  return (
    <div>
      <div className={styles.cardContainer} onClick={() => handleOpenModal(id)}>
        <header>
          {name}
          {activityType === ActivityType.Ride ? (
            <MdDirectionsBike color='var(--light-blue)' />
          ) : (
            <MdDirectionsRun color='#fc5200' />
          )}
        </header>
        <main>
          <p>{`${count} atividades.`}</p>
          <p>{`${locale.format(',.2f')(distance / 1000)} km`}</p>
          <p>{`${secondsToHms(movingTime)}h`}</p>

          {activityType === ActivityType.Ride && lub && (
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
            <span>
              {activityType === ActivityType.Ride ? (
                <MdDirectionsBike color='var(--light-blue)' />
              ) : (
                <MdDirectionsRun color='#fc5200' />
              )}
            </span>
            <span>{name}</span>
            <section>
              <span>
                {`[${count} | 
              ${locale.format(',.2f')(distance / 1000)}km | 
              ${secondsToHms(movingTime)}h]`}
              </span>
            </section>
          </header>

          {activityType === ActivityType.Ride &&
            equipments.map((e) => {
              return <CardItem equipment={e} />;
            })}
        </main>
      </Modal>
    </div>
  );
}
