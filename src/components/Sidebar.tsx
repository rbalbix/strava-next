import React, { useContext } from 'react';

import {
  FaTimes,
  FaHome,
  FaChartBar,
  FaMedapps,
  FaInfoCircle,
} from 'react-icons/fa';

import styles from '../styles/components/Sidebar.module.css';
import AthleteAvatar from './AthleteAvatar';
import AthleteStats from './AthleteStats';
import { AuthContext } from '../contexts/AuthContext';
import Link from 'next/link';
import ComponentInfo from './ComponentInfo';
import InitialInfoModal from './InitialInfoModal';
import { Divider } from '@mui/material';
interface SidebarProps {
  active: (state: boolean) => void;
}

export default function Sidebar({ active }: SidebarProps) {
  const { athlete, handleOpenModal } = useContext(AuthContext);

  const closeSidebar = () => {
    active(false);
  };

  return (
    <div className={styles.sidebarContainer}>
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
            prefetch
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
          <FaInfoCircle className={styles.sidebarItemIcon} aria-label='Ajuda' />
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
  );
}
