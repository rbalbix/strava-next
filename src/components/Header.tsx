import Link from 'next/link';
import { useContext, useState } from 'react';
import { FaBars, FaInfoCircle } from 'react-icons/fa';
import { IoLogInOutline, IoLogOutOutline } from 'react-icons/io5';
import { API_ROUTES, STRAVA_ENDPOINTS } from '../config';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/Header.module.css';

import { PulseLoader } from 'react-spinners';
import Sidebar from './Sidebar';

export default function Header() {
  const {
    athlete,
    codeReturned,
    client_id,
    response_type,
    approval_prompt,
    scope,
    signOut,
    openModal,
  } = useContext(AuthContext);

  const [sidebar, setSidebar] = useState(false);
  const showSidebar = () => setSidebar(!sidebar);

  const authQuery = {
    client_id,
    response_type,
    approval_prompt,
    redirect_uri: API_ROUTES.authorizeUrl,
    scope,
  };

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
            <Link
              href={{
                pathname: STRAVA_ENDPOINTS.authorize,
                query: {
                  ...authQuery,
                },
              }}
            >
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
