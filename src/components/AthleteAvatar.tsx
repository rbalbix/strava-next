import styles from '../styles/components/AthleteAvatar.module.css';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function AthleteAvatar() {
  const { athlete } = useContext(AuthContext);

  return (
    <div className={styles.athleteInfoContainer}>
      <div>
        <img
          className={styles.athleteAvatar}
          src={athlete?.profile}
          alt='Athlete Profile'
        />
      </div>

      <span
        className={styles.athleteName}
      >{`${athlete?.firstname} ${athlete?.lastname}`}</span>
    </div>
  );
}
