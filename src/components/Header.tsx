import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect } from 'react';
import { PushSpinner } from 'react-spinners-kit';
import { baseURL } from '../config';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/Header.module.css';

export default function Header() {
  const route = useRouter();

  const {
    codeError,
    athlete,
    athleteStats,
    codeReturned,
    client_id,
    response_type,
    redirect_uri,
    approval_prompt,
    scope,
    signOut,
  } = useContext(AuthContext);

  useEffect(() => {
    if (performance.navigation.type === 1) {
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
            // <button className={styles.athleteButton}>
            <div className={styles.athleteButton}>
              <Link
                href={{
                  pathname: `https://strava.com/dashboard`,
                }}
                passHref
              >
                <a target='_blank' rel='noreferrer'>
                  <div className={styles.athleteInfo}>
                    <img
                      className={styles.athleteAvatar}
                      src={athlete?.profile}
                      alt='Athlete Profile'
                    />
                  </div>
                </a>
              </Link>
              <span
                className={styles.athleteName}
              >{`${athlete?.firstname} ${athlete?.lastname}`}</span>
              {console.log(athleteStats)}
            </div>
          ) : (
            // </button>
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
