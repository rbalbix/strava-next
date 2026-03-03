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

  return (
    <div className={styles.headerContainer}>
      {!codeReturned ? (
        <>
          <div>
            <FaInfoCircle
              onClick={() => openModal('info')}
              className={styles.headerInfoIcon}
            />
          </div>
          <div>
            <Link href='/api/oauth/start' prefetch={false}>
              <IoLogInOutline className={styles.headerLoginIcon} />
            </Link>
          </div>
        </>
      ) : (
        <div className={styles.headerButtons}>
          {athlete ? (
            <div className={styles.sidebarButton}>
              <FaBars onClick={showSidebar} className={styles.sidebarIcon} />
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

          <Link
            onClick={(e) => {
              e.preventDefault();
              signOut();
            }}
            href='/'
          >
            <IoLogOutOutline className={styles.headerLogoutIcon} />
          </Link>
        </div>
      )}
    </div>
  );
}
