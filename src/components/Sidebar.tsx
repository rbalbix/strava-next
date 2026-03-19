import { useCallback, useContext, useEffect } from 'react';

import {
  FaChartBar,
  FaHome,
  FaInfoCircle,
  FaMedapps,
  FaTimes,
} from 'react-icons/fa';

import Link from 'next/link';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/Sidebar.module.css';
import AthleteAvatar from './AthleteAvatar';
interface SidebarProps {
  active: (state: boolean) => void;
  isOpen: boolean;
}

export default function Sidebar({ active, isOpen }: SidebarProps) {
  const { athlete, openModal } = useContext(AuthContext);

  const closeSidebar = useCallback(() => {
    active(false);
  }, [active]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, closeSidebar]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeSidebar();
    }
  };

  return (
    <>
      <div
        className={`${styles.sidebarOverlay} ${
          isOpen ? styles.sidebarOverlayVisible : ''
        }`}
        onClick={handleOverlayClick}
        aria-hidden='true'
      />
      <div
        className={`${styles.sidebarContainer} ${
          isOpen ? styles.sidebarOpen : ''
        }`}
      >
        <button
          type='button'
          onClick={closeSidebar}
          className={styles.closeButton}
          aria-label='Fechar menu lateral'
        >
          <FaTimes className={styles.closeIcon} />
        </button>

        <div className={styles.sidebarHeader}>
          <AthleteAvatar />
        </div>

        <div>
          <div className={styles.sidebarItemContainer}>
            <FaHome
              className={styles.sidebarItemIcon}
              aria-label='Ir para Meu Strava'
            />
            <Link
              href={{
                pathname: `https://strava.com/dashboard`,
              }}
              passHref
              target='_blank'
              rel='noopener noreferrer'
              className={styles.linkText}
            >
              Meu Strava
            </Link>
          </div>

          <div className={styles.sidebarItemContainer}>
            <FaChartBar
              className={styles.sidebarItemIcon}
              aria-label='Estatísticas'
            />
            <button
              type='button'
              className={`${styles.linkText} ${styles.sidebarAction}`}
              onClick={() => {
                openModal('stats');
                closeSidebar();
              }}
            >
              Estatísticas
            </button>
          </div>

          <div className={styles.sidebarItemContainer}>
            <FaMedapps
              className={styles.sidebarItemIcon}
              aria-label='Componentes'
            />
            <button
              type='button'
              className={`${styles.linkText} ${styles.sidebarAction}`}
              onClick={() => {
                openModal('equipments');
                closeSidebar();
              }}
            >
              Componentes
            </button>
          </div>

          <div className={styles.sidebarItemContainer}>
            <FaInfoCircle
              className={styles.sidebarItemIcon}
              aria-label='Ajuda'
            />
            <button
              type='button'
              className={`${styles.linkText} ${styles.sidebarAction}`}
              onClick={() => {
                openModal('info');
                closeSidebar();
              }}
            >
              Ajuda
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
