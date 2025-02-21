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

export default function Sidebar({ active }) {
  const { athlete, handleOpenModal } = useContext(AuthContext);

  const closeSidebar = () => {
    active(false);
  };

  return (
    <div className={styles.sidebarContainer}>
      <FaTimes onClick={closeSidebar} className={styles.closeIcon} />
      <div className={styles.sidebarContent}>
        <AthleteAvatar />

        <Divider className={styles.divider} style={{ margin: 'auto' }} />

        <div className={styles.sidebarItemContainer}>
          <FaHome />
          <Link
            href={{
              pathname: `https://strava.com/dashboard`,
            }}
            passHref
            target='_blank'
            rel='noreferrer'
            prefetch
          >
            <span className={styles.linkText}>Meu Strava</span>
          </Link>
        </div>

        <Divider className={styles.divider} style={{ margin: 'auto' }} />

        <div className={styles.sidebarItemContainer}>
          <FaChartBar />
          <span
            className={styles.linkText}
            onClick={() => handleOpenModal(athlete.id)}
          >
            Estatísticas
          </span>
          <AthleteStats />
        </div>

        <Divider className={styles.divider} style={{ margin: 'auto' }} />

        <div className={styles.sidebarItemContainer}>
          <FaMedapps />
          <span
            className={styles.linkText}
            onClick={() => handleOpenModal('equipments')}
          >
            Componentes
          </span>
          <ComponentInfo />
        </div>

        <Divider className={styles.divider} style={{ margin: 'auto' }} />

        <div className={styles.sidebarItemContainer}>
          <FaInfoCircle />
          <span
            className={styles.linkText}
            onClick={() => handleOpenModal('info')}
          >
            Ajuda
          </span>
          <InitialInfoModal />
        </div>

        <Divider className={styles.divider} style={{ margin: 'auto' }} />

        {/* 
        <SidebarItem Icon={FaChartBar} Text='Statistics' />
        <SidebarItem Icon={FaUserAlt} Text='Users' />
        <SidebarItem Icon={FaEnvelope} Text='Mail' />
        <SidebarItem Icon={FaRegCalendarAlt} Text='Calendar' />
        <SidebarItem Icon={FaIdCardAlt} Text='Employees' />
        <SidebarItem Icon={FaRegFileAlt} Text='Reports' />
        <SidebarItem Icon={FaRegSun} Text='Settings' /> */}
      </div>
    </div>
  );
}
