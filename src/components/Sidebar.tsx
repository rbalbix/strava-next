import { useContext, useEffect } from 'react';

import {
  FaChartBar,
  FaHome,
  FaInfoCircle,
  FaMedapps,
  FaTimes,
} from 'react-icons/fa';

import { Divider } from '@mui/material';
import Link from 'next/link';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/Sidebar.module.css';
import AthleteAvatar from './AthleteAvatar';
import AthleteStats from './AthleteStats';
import ComponentInfo from './ComponentInfo';
import InitialInfoModal from './InitialInfoModal';
interface SidebarProps {
  active: (state: boolean) => void;
  isOpen: boolean;
}

export default function Sidebar({ active, isOpen }: SidebarProps) {
  const { athlete, handleOpenModal } = useContext(AuthContext);

  const closeSidebar = () => {
    active(false);
  };

  // Fechar o sidebar ao pressionar a tecla ESC
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

  // Fechar sidebar ao clicar fora dele
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
        <div className={styles.sidebarContent}>
          <AthleteAvatar />

          <Divider className={styles.divider} style={{ margin: 'auto' }} />

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

          <Divider className={styles.divider} style={{ margin: 'auto' }} />

          <div className={styles.sidebarItemContainer}>
            <FaChartBar
              className={styles.sidebarItemIcon}
              aria-label='Estatísticas'
            />
            <span
              className={styles.linkText}
              onClick={() => handleOpenModal(athlete.id)}
              role='button'
              tabIndex={0}
            >
              Estatísticas
            </span>
            <AthleteStats />
          </div>

          <Divider className={styles.divider} style={{ margin: 'auto' }} />

          <div className={styles.sidebarItemContainer}>
            <FaMedapps
              className={styles.sidebarItemIcon}
              aria-label='Componentes'
            />
            <span
              className={styles.linkText}
              onClick={() => handleOpenModal('equipments')}
              role='button'
              tabIndex={1}
            >
              Componentes
            </span>
            <ComponentInfo />
          </div>

          <Divider className={styles.divider} style={{ margin: 'auto' }} />

          <div className={styles.sidebarItemContainer}>
            <FaInfoCircle
              className={styles.sidebarItemIcon}
              aria-label='Ajuda'
            />
            <span
              className={styles.linkText}
              onClick={() => handleOpenModal('info')}
              role='button'
              tabIndex={2}
            >
              Ajuda
            </span>
            <InitialInfoModal />
          </div>

          <Divider className={styles.divider} style={{ margin: 'auto' }} />
        </div>
      </div>
    </>
  );
}
