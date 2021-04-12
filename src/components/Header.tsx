import Link from 'next/link';
import { useContext } from 'react';
import { baseURL } from '../config';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/Header.module.css';

import { PushSpinner } from 'react-spinners-kit';

export default function Header() {
  const {
    athlete,
    codeReturned,
    client_id,
    response_type,
    redirect_uri,
    approval_prompt,
    scope,
    signOut,
  } = useContext(AuthContext);
  return (
    <div className={styles.headerContainer}>
      {codeReturned === '' ? (
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
      ) : (
        <>
          {athlete ? (
            <>
              <span
                className={styles.athleteName}
              >{`${athlete?.firstname} ${athlete?.lastname}`}</span>
              <img
                className={styles.athleteAvatar}
                src={athlete?.profile}
                alt='Athlete Profile'
              />
            </>
          ) : (
            <PushSpinner size={20} loading={true} />
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
