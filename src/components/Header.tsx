import styles from '../styles/components/Header.module.css';
import Link from 'next/link';

import { baseURL } from '../config';

export default function Header() {
  return (
    <div className={styles.headerContainer}>
      <button className={styles.signInButton}>
        <Link
          href={{
            pathname: `${baseURL}/authorize`,
            query: {
              client_id: process.env.CLIENT_ID,
              response_type: process.env.RESPONSE_TYPE,
              redirect_uri: process.env.REDIRECT_URI,
              approval_prompt: process.env.APPROVAL_PROMPT,
              scope: process.env.STRAVA_SCOPE,
            },
          }}
        >
          Sign in
        </Link>
      </button>
    </div>
  );
}
