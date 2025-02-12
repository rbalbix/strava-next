import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect } from 'react';
import { FaArrowRight, FaInfoCircle } from 'react-icons/fa';
import { IoMdStats } from 'react-icons/io';
import { IoLogInOutline, IoLogOutOutline } from 'react-icons/io5';
import { MdClose, MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import { PushSpinner } from 'react-spinners-kit';
import { baseURL } from '../config';
import { AuthContext } from '../contexts/AuthContext';
import cardStyles from '../styles/components/Card.module.css';
import styles from '../styles/components/Header.module.css';
import modalStyles from '../styles/components/Modal.module.css';

import Divider from '@mui/material/Divider';
import { Modal } from '../components/Modal';
import { locale, secondsToHms } from '../services/utils';
import InitialInfo from './InitialInfo';

export default function Header() {
  const route = useRouter();

  const {
    athlete,
    athleteStats,
    codeReturned,
    client_id,
    response_type,
    redirect_uri,
    approval_prompt,
    scope,
    signOut,
    handleOpenModal,
    handleCloseModal,
  } = useContext(AuthContext);

  useEffect(() => {
    if (
      (window.performance.getEntries()[0] as PerformanceNavigationTiming)
        .type === 'reload'
    ) {
      if (codeReturned) {
        route.replace({
          pathname: `${baseURL}/authorize`,
          query: {
            client_id,
            response_type,
            redirect_uri,
            approval_prompt,
            scope,
          },
        });
      } else {
        signOut();
      }
    }
  }, []);

  return (
    <div className={styles.headerContainer}>
      {!codeReturned ? (
        <>
          <div>
            {' '}
            <FaInfoCircle
              onClick={() => handleOpenModal('info')}
              className={styles.headerInfoIcon}
            />
          </div>
          <div>
            <Link
              href={{
                pathname: `${baseURL}/authorize`,
                query: {
                  client_id,
                  response_type,
                  redirect_uri,
                  approval_prompt,
                  scope,
                },
              }}
            >
              <IoLogInOutline className={styles.headerLoginIcon} />
            </Link>
          </div>

          <Modal id={'info'} closeModal={handleCloseModal}>
            <main>
              <header>
                <div>
                  <div>
                    <span>
                      <FaInfoCircle color='var(--stat-icon)' />
                    </span>
                  </div>
                  <div>
                    <MdClose color='var(--stat-icon)' />
                  </div>
                </div>
              </header>
              <section>
                <InitialInfo />
              </section>
              <footer>
                <Divider
                  className={styles.divider}
                  style={{ margin: 'auto' }}
                />
              </footer>
            </main>
          </Modal>
        </>
      ) : (
        <>
          {athlete ? (
            <div className={styles.athleteButton}>
              <Link
                href={{
                  pathname: `https://strava.com/dashboard`,
                }}
                passHref
                target='_blank'
                rel='noreferrer'
              >
                <div className={styles.athleteInfo}>
                  <img
                    className={styles.athleteAvatar}
                    src={athlete?.profile}
                    alt='Athlete Profile'
                  />
                </div>
              </Link>
              <span
                onClick={() => handleOpenModal(athlete.id)}
                className={styles.athleteName}
              >{`${athlete?.firstname} ${athlete?.lastname}`}</span>
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
                        <p>{`[${
                          athleteStats.ytd_ride_totals.count
                        } | ${locale.format(',.2f')(
                          athleteStats.ytd_ride_totals.distance / 1000
                        )}km | 
                        
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
                        <p>{`[${
                          athleteStats.all_ride_totals.count
                        } | ${locale.format(',.2f')(
                          athleteStats.all_ride_totals.distance / 1000
                        )}km | 
                        
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
                        <p>{`[${
                          athleteStats.recent_run_totals.count
                        } | ${locale.format(',.2f')(
                          athleteStats.recent_run_totals.distance / 1000
                        )}km |  
                        
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
                        <p>{`[${
                          athleteStats.ytd_run_totals.count
                        } | ${locale.format(',.2f')(
                          athleteStats.ytd_run_totals.distance / 1000
                        )}km | 
                        
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
                        <p>{`[${
                          athleteStats.all_run_totals.count
                        } | ${locale.format(',.2f')(
                          athleteStats.all_run_totals.distance / 1000
                        )}km | 
                        
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
            </div>
          ) : (
            <span className={styles.spinnerLoading}>
              <PushSpinner
                size={20}
                loading={true}
                color='var(--athlete-name)'
              />
            </span>
          )}

          <Link
            onClick={(e) => {
              e.preventDefault();
              signOut();
            }}
            href='/'
          >
            <IoLogOutOutline className={styles.headerLogoutIcon} />
          </Link>
        </>
      )}
    </div>
  );
}
