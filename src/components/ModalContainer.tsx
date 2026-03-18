import { useContext, useEffect, useMemo, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { GearStats } from '../services/gear';
import styles from '../styles/components/ModalContainer.module.css';
import AthleteStats from './AthleteStats';
import CardDetailModal from './CardDetailModal';
import ComponentInfo from './ComponentInfo';
import InitialInfoModal from './InitialInfoModal';

export default function ModalContainer() {
  const { activeModal, modalData, closeModal } = useContext(AuthContext);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const modalLabel = useMemo(() => {
    switch (activeModal) {
      case 'stats':
        return 'Estatísticas';
      case 'equipments':
        return 'Componentes';
      case 'info':
        return 'Informações';
      case 'card-detail':
        return 'Detalhes do equipamento';
      default:
        return 'Janela';
    }
  }, [activeModal]);

  const getFocusableElements = () => {
    if (!modalRef.current) return [];
    const elements = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    return elements.filter(
      (el) =>
        !el.hasAttribute('disabled') &&
        el.getAttribute('aria-hidden') !== 'true',
    );
  };

  useEffect(() => {
    if (activeModal) {
      lastActiveElementRef.current = document.activeElement as HTMLElement | null;

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

      if (lastActiveElementRef.current) {
        lastActiveElementRef.current.focus();
      }
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

        if (lastActiveElementRef.current) {
          lastActiveElementRef.current.focus();
        }
      }
    };
  }, [activeModal]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    if (!activeModal) return;

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [activeModal, closeModal]);

  useEffect(() => {
    if (!activeModal) return;

    const focusFirst = () => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    };

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !modalRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const focusTimer = window.setTimeout(focusFirst, 0);
    document.addEventListener('keydown', handleTab);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleTab);
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
        <CardDetailModal gearStat={modalData as GearStats} onClose={closeModal} />
      );
      break;
    default:
      return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-label={modalLabel}
        tabIndex={-1}
        ref={modalRef}
      >
        {modalContent}
      </div>
    </div>
  );
}
