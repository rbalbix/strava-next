import { useContext, useEffect } from 'react';

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

  const closeSidebar = () => {
    active(false);
  };

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
  }, [isOpen]);

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
        <FaTimes
          onClick={closeSidebar}
          className={styles.closeIcon}
          aria-label='Fechar menu lateral'
        />

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
            >
              <span className={styles.linkText}>Meu Strava</span>
            </Link>
          </div>

          <div className={styles.sidebarItemContainer}>
            <FaChartBar
              className={styles.sidebarItemIcon}
              aria-label='Estatísticas'
            />
            <span
              className={styles.linkText}
              onClick={() => {
                openModal('stats');
                closeSidebar();
              }}
              role='button'
              tabIndex={0}
            >
              Estatísticas
            </span>
          </div>

          <div className={styles.sidebarItemContainer}>
            <FaMedapps
              className={styles.sidebarItemIcon}
              aria-label='Componentes'
            />
            <span
              className={styles.linkText}
              onClick={() => {
                openModal('equipments');
                closeSidebar();
              }}
              role='button'
              tabIndex={1}
            >
              Componentes
            </span>
          </div>

          <div className={styles.sidebarItemContainer}>
            <FaInfoCircle
              className={styles.sidebarItemIcon}
              aria-label='Ajuda'
            />
            <span
              className={styles.linkText}
              onClick={() => {
                openModal('info');
                closeSidebar();
              }}
              role='button'
              tabIndex={2}
            >
              Ajuda
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
