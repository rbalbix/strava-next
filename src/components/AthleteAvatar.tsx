import Image from 'next/image';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/AthleteAvatar.module.css';

export default function AthleteAvatar() {
  const { athlete } = useContext(AuthContext);
  const avatarUrl = athlete?.profile || '';

  if (!athlete || !avatarUrl) return null;

  return (
    <div className={styles.athleteInfoContainer}>
      <div>
        <Image
          className={styles.athleteAvatar}
          src={avatarUrl}
          alt={`${athlete.firstname || 'Athlete'}'s Profile`}
          width={64}
          height={64}
          unoptimized
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
