import { useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

import styles from '../styles/components/ErroMsg.module.css';

export default function ErroMsg() {
  const { codeError } = useContext(AuthContext);
  const { showToast } = useToast();
  const hasShownRef = useRef(false);
  const status =
    typeof codeError === 'object' &&
    codeError !== null &&
    'status' in codeError
      ? (codeError as { status?: number }).status
      : undefined;

  useEffect(() => {
    if (status === 429 && !hasShownRef.current) {
      showToast('Limite excedido. Tente novamente em 15 minutos.', 'error');
      hasShownRef.current = true;
    }
  }, [status, showToast]);

  if (status !== 429) return null;

  return (
    <div className={styles.erroMsgContainer} role='alert' aria-live='assertive'>
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
