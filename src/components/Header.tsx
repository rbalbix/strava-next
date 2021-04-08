import Link from 'next/link';
import { useContext } from 'react';
import { baseURL } from '../config';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/Header.module.css';

export default function Header() {
  const { user, codeReturned, client_id, response_type, signOut } = useContext(
    AuthContext
  );
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
                redirect_uri: process.env.REDIRECT_URI,
                approval_prompt: process.env.APPROVAL_PROMPT,
                scope: process.env.STRAVA_SCOPE,
              },
            }}
          >
            Sign in
          </Link>
        </button>
      ) : (
        <>
          <span className={styles.userName}>{user?.name}</span>
          <img className={styles.userAvatar} src={user?.avatar} alt='' />

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
