import { useContext } from 'react';
import { FaMedapps } from 'react-icons/fa';
import { AuthContext } from '../contexts/AuthContext';

import styles from '../styles/components/Footer.module.css';

export default function Footer() {
  const { athlete, openModal } = useContext(AuthContext);

  return (
    <footer className={styles.footerContainer} aria-label='Ações do rodapé'>
      {athlete && (
        <div>
          <button
            type='button'
            onClick={() => openModal('equipments')}
            className={styles.footerIconButton}
            aria-label='Abrir componentes'
          >
            <FaMedapps className={styles.footerIcon} />
          </button>
        </div>
      )}
    </footer>
  );
}
