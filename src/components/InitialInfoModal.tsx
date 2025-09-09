import Divider from '@mui/material/Divider';
import { useContext } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { AuthContext } from '../contexts/AuthContext';
import cardStyles from '../styles/components/Card.module.css';
import styles from '../styles/components/InitialInfoModal.module.css';
import InitialInfo from './InitialInfo';

export default function InitialInfoModal() {
  const { closeModal } = useContext(AuthContext);

  return (
    <main className={cardStyles.athleteStatInfoContent}>
      <header>
        <div className={cardStyles.athleteStatInfoTitle}>
          <div>
            <span className={cardStyles.athleteStatInfoTitleIcon}>
              <FaInfoCircle
                aria-label='Ícone de informações'
                color='var(--stat-icon)'
              />
            </span>
          </div>
          <div>
            <MdClose onClick={closeModal} style={{ cursor: 'pointer' }} />
          </div>
        </div>
      </header>
      <section>
        <InitialInfo />
      </section>
      <footer>
        <Divider className={styles.divider} style={{ margin: 'auto' }} />
      </footer>
    </main>
  );
}
