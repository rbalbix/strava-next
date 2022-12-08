import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

import styles from '../styles/components/ErroMsg.module.css';

export default function ErroMsg() {
  const { codeError } = useContext(AuthContext);

  return (
    <>
      {codeError?.status === 429 ? (
        <div className={styles.erroMsgContainer}>
          <div className={styles.headerContainer}>
            <header>Limite de consultas excedido.</header>
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
      ) : (
        ''
      )}
    </>
  );
}
