import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import { IoMdStats } from 'react-icons/io';
import { MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import { PushSpinner } from 'react-spinners-kit';
import { baseURL } from '../config';
import { AuthContext } from '../contexts/AuthContext';
import cardStyles from '../styles/components/Card.module.css';
import modalStyles from '../styles/components/Modal.module.css';
import styles from '../styles/components/Header.module.css';

import { Modal } from '../components/Modal';
import { locale, secondsToHms } from '../services/utils';
import Divider from '@mui/material/Divider';

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
          <div className={styles.buttonBox}>
            <button className={styles.signInButton}>
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
                Sign in
              </Link>
            </button>
          </div>
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
                      <span>
                        <IoMdStats color='var(--light-blue)' />
                      </span>
                      <span>Estatísticas:</span>
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
              <PushSpinner size={20} loading={true} />
            </span>
          )}

          <button
            className={styles.signOutButton}
            onClick={(e) => {
              e.preventDefault();
              signOut();
            }}
          >
            <Link href='/'>Sign out</Link>
          </button>
        </>
      )}
    </div>
  );
}
