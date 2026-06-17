import Divider from '@mui/material/Divider';
import { useContext } from 'react';
import { MdClose } from 'react-icons/md';
import { TfiHelp } from 'react-icons/tfi';
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
              <TfiHelp aria-hidden='true' focusable='false' />
            </span>
            <h2
              id='modal-title-info'
              className={cardStyles.athleteStatInfoHeading}
            >
              Como funciona
            </h2>
          </div>
          <div>
            <button
              type='button'
              onClick={closeModal}
              className={styles.closeButton}
              aria-label='Fechar informações'
            >
              <MdClose aria-hidden='true' focusable='false' />
            </button>
          </div>
        </div>
      </header>
      <section id='modal-desc-info'>
        <InitialInfo />
      </section>
      <footer>
        <Divider className={styles.divider} style={{ margin: 'auto' }} />
      </footer>
    </main>
  );
}
