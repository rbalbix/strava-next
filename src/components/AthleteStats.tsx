import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Modal } from './Modal';
import modalStyles from '../styles/components/Modal.module.css';
import { IoMdStats } from 'react-icons/io';
import { MdClose, MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import cardStyles from '../styles/components/Card.module.css';
import { locale, secondsToHms } from '../services/utils';
import { FaArrowRight } from 'react-icons/fa';
import Divider from '@mui/material/Divider';

export default function AthleteStats() {
  const { athlete, athleteStats, handleCloseModal } = useContext(AuthContext);

  return (
    <>
      {athleteStats && (
        <Modal id={athlete.id} closeModal={handleCloseModal}>
          <main className={modalStyles.athleteStatInfoContent}>
            <header>
              <div>
                <div>
                  <span>
                    <IoMdStats color='var(--stat-icon)' />
                  </span>
                  <span>Estatísticas:</span>
                </div>
                <div>
                  <MdClose color='var(--stat-icon)' />
                </div>
              </div>
            </header>
            <div className={cardStyles.cardContainer}>
              <header>
                <MdDirectionsBike color='var(--light-blue)' />
              </header>
              <div className={modalStyles.info}>
                <p>{`Maior distância: ${locale.format(',.2f')(
                  athleteStats.biggest_ride_distance / 1000
                )}km`}</p>
                <p>{`Maior escalada: ${locale.format(',.2f')(
                  athleteStats.biggest_climb_elevation_gain
                )}m`}</p>
                <p className={cardStyles.cardNewItem}>
                  <span>
                    <FaArrowRight />
                  </span>
                  <span>Últimas 4 semanas:</span>
                </p>
                <p>{`[${
                  athleteStats.recent_ride_totals.count
                } | ${locale.format(',.2f')(
                  athleteStats.recent_ride_totals.distance / 1000
                )}km |  
                        
                        ${secondsToHms(
                          athleteStats.recent_ride_totals.moving_time
                        )}h

                        | ${locale.format(',.2f')(
                          athleteStats.recent_ride_totals.elevation_gain
                        )}m]`}</p>

                <p className={cardStyles.cardNewItem}>
                  <span>
                    <FaArrowRight />
                  </span>
                  <span>Último ano:</span>
                </p>
                <p>{`[${athleteStats.ytd_ride_totals.count} | ${locale.format(
                  ',.2f'
                )(athleteStats.ytd_ride_totals.distance / 1000)}km | 
                        
                        ${secondsToHms(
                          athleteStats.ytd_ride_totals.moving_time
                        )}h
                        
                        | ${locale.format(',.2f')(
                          athleteStats.ytd_ride_totals.elevation_gain
                        )}m]`}</p>

                <p className={cardStyles.cardNewItem}>
                  <span>
                    <FaArrowRight />
                  </span>
                  <span>Totais:</span>
                </p>
                <p>{`[${athleteStats.all_ride_totals.count} | ${locale.format(
                  ',.2f'
                )(athleteStats.all_ride_totals.distance / 1000)}km | 
                        
                        ${secondsToHms(
                          athleteStats.all_ride_totals.moving_time
                        )}h
                        
                        | ${locale.format(',.2f')(
                          athleteStats.all_ride_totals.elevation_gain
                        )}m]`}</p>
              </div>
            </div>

            <Divider />

            <div className={cardStyles.cardContainer}>
              <header>
                <MdDirectionsRun color='#fc5200' />
              </header>
              <div>
                <p className={cardStyles.cardNewItem}>
                  <span>
                    <FaArrowRight />
                  </span>
                  <span>Últimas 4 semanas:</span>
                </p>
                <p>{`[${athleteStats.recent_run_totals.count} | ${locale.format(
                  ',.2f'
                )(athleteStats.recent_run_totals.distance / 1000)}km |  
                        
                        ${secondsToHms(
                          athleteStats.recent_run_totals.moving_time
                        )}h

                        | ${locale.format(',.2f')(
                          athleteStats.recent_run_totals.elevation_gain
                        )}m]`}</p>

                <p className={cardStyles.cardNewItem}>
                  <span>
                    <FaArrowRight />
                  </span>
                  <span>Último ano:</span>
                </p>
                <p>{`[${athleteStats.ytd_run_totals.count} | ${locale.format(
                  ',.2f'
                )(athleteStats.ytd_run_totals.distance / 1000)}km | 
                        
                        ${secondsToHms(
                          athleteStats.ytd_run_totals.moving_time
                        )}h
                        
                        | ${locale.format(',.2f')(
                          athleteStats.ytd_run_totals.elevation_gain
                        )}m]`}</p>

                <p className={cardStyles.cardNewItem}>
                  <span>
                    <FaArrowRight />
                  </span>
                  <span>Totais:</span>
                </p>
                <p>{`[${athleteStats.all_run_totals.count} | ${locale.format(
                  ',.2f'
                )(athleteStats.all_run_totals.distance / 1000)}km | 
                        
                        ${secondsToHms(
                          athleteStats.all_run_totals.moving_time
                        )}h
                        
                        | ${locale.format(',.2f')(
                          athleteStats.all_run_totals.elevation_gain
                        )}m]`}</p>
              </div>
            </div>
          </main>
        </Modal>
      )}
    </>
  );
}
