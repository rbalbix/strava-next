import { FaInfoCircle } from 'react-icons/fa';
import { Modal } from './Modal';
import { MdClose } from 'react-icons/md';
import InitialInfo from './InitialInfo';
import Divider from '@mui/material/Divider';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/InitialInfoModal.module.css';

export default function InitialInfoModal() {
  const { handleCloseModal } = useContext(AuthContext);
  return (
    <Modal id={'info'} closeModal={handleCloseModal}>
      <main>
        <header>
          <div>
            <div>
              <span>
                <FaInfoCircle
                  aria-label='Ícone de informações'
                  color='var(--stat-icon)'
                />
              </span>
            </div>
            <div>
              <MdClose
                aria-label='Fechar janela modal'
                color='var(--stat-icon)'
                onClick={handleCloseModal}
              />
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
    </Modal>
  );
}
