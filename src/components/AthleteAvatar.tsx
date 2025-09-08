import styles from '../styles/components/AthleteAvatar.module.css';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function AthleteAvatar() {
  const { athlete } = useContext(AuthContext);

  if (!athlete) return null;

  return (
    <div className={styles.athleteInfoContainer}>
      <div>
        <img
          className={styles.athleteAvatar}
          src={athlete?.profile}
          alt={`${athlete?.firstname || 'Athlete'}'s Profile`}
        />
      </div>
      <div>
        <span className={styles.athleteName}>
          {athlete.firstname
            ? `${athlete.firstname} ${athlete.lastname || ''}`
            : 'Usuário Desconhecido'}
        </span>
      </div>
      <div className={styles.athleteCity}>
        <span>{athlete.city ? athlete.city : ''}</span>
      </div>
    </div>
  );
}
