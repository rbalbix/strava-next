import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

import styles from '../styles/components/ErroMsg.module.css';

export default function ErroMsg() {
  const { codeError } = useContext(AuthContext);

  return (
    <div className={styles.erroMsgContainer}>
      {codeError ? (
        <>
          <header>
            {codeError.status === 429
              ? 'Limite de consultas excedido.'
              : `${codeError.message} (${codeError.status})`}
          </header>
          <main>
            <p>
              {codeError.status === 429
                ? 'O strava possui uma limitação de consultas por tempo. Tente novamente em 15 minutos.'
                : codeError.message}
            </p>
          </main>
        </>
      ) : (
        ''
      )}
    </div>
  );
}
