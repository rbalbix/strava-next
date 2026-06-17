import { useContext, useState } from 'react';
import { HiDotsHorizontal } from 'react-icons/hi';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/Header.module.css';

import { PulseLoader } from 'react-spinners';
import Sidebar from './Sidebar';

export default function Header() {
  const { athlete, codeReturned, signOut, openModal } = useContext(AuthContext);

  const [sidebar, setSidebar] = useState(false);
  const showSidebar = () => setSidebar(!sidebar);
  const sidebarId = 'sidebar-menu';

  return (
    <header className={styles.headerContainer}>
      {!codeReturned ? (
        <>
          <div className={styles.sidebarButton}>
            <button
              type='button'
              onClick={showSidebar}
              className={styles.buttonSidebarHeader}
              aria-label='Abrir menu lateral'
              aria-expanded={sidebar}
              aria-controls={sidebarId}
              aria-haspopup='dialog'
            >
              {/* <FaBars
                  className={styles.sidebarIcon}
                  aria-hidden='true'
                  focusable='false'
                /> */}
              <HiDotsHorizontal
                className={styles.sidebarIcon}
                aria-hidden='true'
                focusable='false'
              />
            </button>
            <Sidebar active={setSidebar} isOpen={sidebar} />
          </div>
        </>
      ) : (
        <div className={styles.headerButtons}>
          {athlete ? (
            <div className={styles.sidebarButton}>
              <button
                type='button'
                onClick={showSidebar}
                className={styles.buttonSidebarHeader}
                aria-label='Abrir menu lateral'
                aria-expanded={sidebar}
                aria-controls={sidebarId}
                aria-haspopup='dialog'
              >
                <HiDotsHorizontal
                  className={styles.sidebarIcon}
                  aria-hidden='true'
                  focusable='false'
                />
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
        </div>
      )}
    </header>
  );
}
