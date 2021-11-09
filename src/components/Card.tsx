import * as d3 from 'd3-format';
import { useState } from 'react';
import { MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import { Modal } from '../components/Modal';
import styles from '../styles/components/Card.module.css';

const locale = d3.formatLocale({
  decimal: ',',
  thousands: '.',
  grouping: [3],
  currency: ['R$', ''],
});

export default function Card(props) {
  function handleOpenModal(id: string) {
    handleCloseModal();
    document.getElementById(id).style.display = 'block';
  }

  function handleCloseModal() {
    const itens = Array.from(
      document.getElementsByClassName('modal') as HTMLCollectionOf<HTMLElement>
    );
    itens.map((item) => {
      item.style.display = 'none';
    });
  }

  return (
    <>
      <div
        className={styles.cardContainer}
        onClick={() => handleOpenModal(props.gear.id)}
      >
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

          {props.gear.type === 'Ride' && (
            <div>
              {props.gear.lubDistance != 0 && (
                <p>{`última lubrificação: ${locale.format(',.2f')(
                  props.gear.lubDistance / 1000
                )} km  | ${secondsToHms(props.gear.lubMovingTime)}`}</p>
              )}

              {props.gear.frontLightDistance != 0 && (
                <p>{`última carga do front light: ${locale.format(',.2f')(
                  props.gear.frontLightDistance / 1000
                )} km  | ${secondsToHms(props.gear.frontLightMovingTime)}`}</p>
              )}

              {props.gear.rearLightDistance != 0 && (
                <p>{`última carga do rear light: ${locale.format(',.2f')(
                  props.gear.rearLightDistance / 1000
                )} km  | ${secondsToHms(props.gear.rearLightMovingTime)}`}</p>
              )}
            </div>
          )}
        </main>
      </div>

      <Modal id={props.gear.id} closeModal={handleCloseModal}>
        <main>
          {props.gear.type === 'Ride' ? (
            <MdDirectionsBike color='var(--light-blue)' />
          ) : (
            <MdDirectionsRun color='#fc5200' />
          )}
          {props.gear.name}
          <p>{`${props.gear.count} atividades.`}</p>
          <p>{`${locale.format(',.2f')(props.gear.distance / 1000)} km`}</p>
          <p>{`${secondsToHms(props.gear.totalMovingTime)}`}</p>

          {props.gear.type === 'Ride' && (
            <div>
              {props.gear.lubDistance != 0 && (
                <p>{`última lubrificação: ${locale.format(',.2f')(
                  props.gear.lubDistance / 1000
                )} km  | ${secondsToHms(props.gear.lubMovingTime)}`}</p>
              )}

              {props.gear.frontLightDistance != 0 && (
                <p>{`última carga do front light: ${locale.format(',.2f')(
                  props.gear.frontLightDistance / 1000
                )} km  | ${secondsToHms(props.gear.frontLightMovingTime)}`}</p>
              )}

              {props.gear.rearLightDistance != 0 && (
                <p>{`última carga do rear light: ${locale.format(',.2f')(
                  props.gear.rearLightDistance / 1000
                )} km  | ${secondsToHms(props.gear.rearLightMovingTime)}`}</p>
              )}
            </div>
          )}
        </main>
      </Modal>
    </>
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
