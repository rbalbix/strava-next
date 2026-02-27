import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

import styles from '../styles/components/ErroMsg.module.css';

export default function ErroMsg() {
  const { codeError } = useContext(AuthContext);
  const status =
    typeof codeError === 'object' &&
    codeError !== null &&
    'status' in codeError
      ? (codeError as { status?: number }).status
      : undefined;

  if (status !== 429) return null;

  return (
    <div className={styles.erroMsgContainer}>
      <div className={styles.headerContainer}>
        <header>Limite excedido</header>
      </div>
      <div>
        <main>
          <p>
            O strava possui uma limitação de consultas por tempo. Tente
            novamente em 15 minutos.
          </p>
        </main>
      </div>
    </div>
  );
}
