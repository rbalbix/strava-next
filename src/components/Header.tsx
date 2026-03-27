import Link from 'next/link';
import { useContext, useState } from 'react';
import { FaBars, FaInfoCircle } from 'react-icons/fa';
import { IoLogInOutline, IoLogOutOutline } from 'react-icons/io5';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/Header.module.css';

import { PulseLoader } from 'react-spinners';
import Sidebar from './Sidebar';

export default function Header() {
  const {
    athlete,
    codeReturned,
    signOut,
    openModal,
  } = useContext(AuthContext);

  const [sidebar, setSidebar] = useState(false);
  const showSidebar = () => setSidebar(!sidebar);
  const sidebarId = 'sidebar-menu';

  return (
    <header className={styles.headerContainer}>
      {!codeReturned ? (
        <>
          <div>
            <button
              type='button'
              onClick={() => openModal('info')}
              className={styles.iconButton}
              aria-label='Abrir informações'
            >
              <FaInfoCircle
                className={styles.headerInfoIcon}
                aria-hidden='true'
                focusable='false'
              />
            </button>
          </div>
          <div>
            <Link
              href='/api/oauth/start'
              prefetch={false}
              className={styles.iconButtonLink}
              aria-label='Entrar com Strava'
            >
              <IoLogInOutline
                className={styles.headerLoginIcon}
                aria-hidden='true'
                focusable='false'
              />
            </Link>
          </div>
        </>
      ) : (
        <div className={styles.headerButtons}>
          {athlete ? (
            <div className={styles.sidebarButton}>
              <button
                type='button'
                onClick={showSidebar}
                className={styles.iconButton}
                aria-label='Abrir menu lateral'
                aria-expanded={sidebar}
                aria-controls={sidebarId}
                aria-haspopup='dialog'
              >
                <FaBars className={styles.sidebarIcon} aria-hidden='true' focusable='false' />
              </button>
              <Sidebar active={setSidebar} isOpen={sidebar} />
            </div>
          ) : (
            <span className={styles.spinnerLoading}>
              <PulseLoader
                color='var(--athlete-name)'
                loading={true}
                size={20}
              />
            </span>
          )}

          <button
            type='button'
            className={styles.iconButton}
            onClick={() => {
              signOut();
            }}
            aria-label='Sair da conta'
          >
            <IoLogOutOutline
              className={styles.headerLogoutIcon}
              aria-hidden='true'
              focusable='false'
            />
          </button>
        </div>
      )}
    </header>
  );
}
