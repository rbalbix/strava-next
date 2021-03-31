import styles from '../styles/components/Header.module.css';
import Link from 'next/link';

export default function Header() {
  return (
    <div className={styles.headerContainer}>
      <button className={styles.signInButton}>
        <Link
          href={{
            pathname: 'https://www.strava.com/oauth/authorize',
            query: {
              client_id: '63218',
              response_type: 'code',
              redirect_uri: 'http://localhost:3000/authorize',
              approval_prompt: 'force',
              scope: 'read,profile:read_all,activity:read,activity:read_all',
            },
          }}
        >
          Sign in
        </Link>
      </button>
    </div>
  );
}
