import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import { FaBars, FaInfoCircle } from 'react-icons/fa';
import { IoLogInOutline, IoLogOutOutline } from 'react-icons/io5';
import { PushSpinner } from 'react-spinners-kit';
import { baseURL } from '../config';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/Header.module.css';

import Sidebar from './Sidebar';
import InitialInfoModal from './InitialInfoModal';

export default function Header() {
  const route = useRouter();

  const {
    athlete,
    codeReturned,
    client_id,
    response_type,
    redirect_uri,
    approval_prompt,
    scope,
    signOut,
    handleOpenModal,
  } = useContext(AuthContext);

  const [sidebar, setSidebar] = useState(false);
  const showSidebar = () => setSidebar(!sidebar);

  const authQuery = {
    client_id,
    response_type,
    redirect_uri,
    approval_prompt,
    scope,
  };

  useEffect(() => {
    const performanceEntries = window.performance.getEntries();
    const firstEntry = performanceEntries.length ? performanceEntries[0] : null;

    if (
      firstEntry &&
      (firstEntry as PerformanceNavigationTiming).type === 'reload'
    ) {
      if (codeReturned) {
        route.replace({
          pathname: `${baseURL}/authorize`,
          query: authQuery,
        });
      } else {
        signOut();
      }
    }
  }, [codeReturned]);

  return (
    <div className={styles.headerContainer}>
      {!codeReturned ? (
        <>
          <div>
            <FaInfoCircle
              onClick={() => handleOpenModal('info')}
              className={styles.headerInfoIcon}
            />
          </div>
          <div>
            <Link href={{ pathname: `${baseURL}/authorize`, query: authQuery }}>
              <IoLogInOutline className={styles.headerLoginIcon} />
            </Link>
          </div>
          <InitialInfoModal />
        </>
      ) : (
        <div className={styles.headerButtons}>
          {athlete ? (
            <div className={styles.sidebarButton}>
              <FaBars onClick={showSidebar} className={styles.sidebarIcon} />
              {sidebar && <Sidebar active={() => setSidebar(false)} />}
            </div>
          ) : (
            <span className={styles.spinnerLoading}>
              <PushSpinner
                size={20}
                loading={true}
                color='var(--athlete-name)'
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
