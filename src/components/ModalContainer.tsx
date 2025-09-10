import { useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/ModalContainer.module.css';
import AthleteStats from './AthleteStats';
import CardDetailModal from './CardDetailModal';
import ComponentInfo from './ComponentInfo';
import InitialInfoModal from './InitialInfoModal';

export default function ModalContainer() {
  const { activeModal, modalData, closeModal } = useContext(AuthContext);

  useEffect(() => {
    if (activeModal) {
      // Salva a posição atual do scroll
      const scrollY = window.scrollY;

      // Calcula a largura da barra de rolagem para compensar
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      // Aplica estilos para prevenir o deslocamento
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = 'hidden';
    } else {
      // Restaura os estilos quando o modal fecha
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';

      // Restaura a posição do scroll
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }

    return () => {
      // Cleanup para garantir que o scroll seja restaurado
      if (!activeModal) {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [activeModal]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    if (activeModal) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [activeModal]);

  if (!activeModal) return null;

  let modalContent = null;

  switch (activeModal) {
    case 'stats':
      modalContent = <AthleteStats />;
      break;
    case 'equipments':
      modalContent = <ComponentInfo />;
      break;
    case 'info':
      modalContent = <InitialInfoModal />;
      break;
    case 'card-detail':
      modalContent = (
        <CardDetailModal gearStat={modalData} onClose={closeModal} />
      );
      break;
    default:
      return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {modalContent}
      </div>
    </div>
  );
}
