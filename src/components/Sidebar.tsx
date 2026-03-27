import { useCallback, useContext, useEffect, useRef } from 'react';

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
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const closeSidebar = useCallback(() => {
    active(false);
  }, [active]);

  const getFocusableElements = useCallback(() => {
    if (!sidebarRef.current) return [];
    const elements = Array.from(
      sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])',
      ),
    );
    return elements.filter((el) => !el.hasAttribute('disabled'));
  }, []);

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

  useEffect(() => {
    if (!isOpen) {
      if (lastActiveElementRef.current) {
        lastActiveElementRef.current.focus();
      }
      return;
    }

    lastActiveElementRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else if (sidebarRef.current) {
        sidebarRef.current.focus();
      }
    };

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (activeElement === first || !sidebarRef.current?.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const focusTimer = window.setTimeout(focusFirst, 0);
    document.addEventListener('keydown', handleTab);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleTab);
      if (lastActiveElementRef.current) {
        lastActiveElementRef.current.focus();
      }
    };
  }, [isOpen, getFocusableElements]);

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
        role='presentation'
        aria-hidden={!isOpen}
      />
      <div
        className={`${styles.sidebarContainer} ${
          isOpen ? styles.sidebarOpen : ''
        }`}
        id='sidebar-menu'
        ref={sidebarRef}
        role='dialog'
        aria-modal='true'
        aria-label='Menu lateral'
        aria-hidden={!isOpen}
        tabIndex={-1}
      >
        <button
          type='button'
          onClick={closeSidebar}
          className={styles.closeButton}
          aria-label='Fechar menu lateral'
        >
          <FaTimes className={styles.closeIcon} aria-hidden='true' focusable='false' />
        </button>

        <div className={styles.sidebarHeader}>
          <AthleteAvatar />
        </div>

        <div>
          <div className={styles.sidebarItemContainer}>
            <FaHome
              className={styles.sidebarItemIcon}
              aria-hidden='true'
              focusable='false'
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
              aria-hidden='true'
              focusable='false'
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
              aria-hidden='true'
              focusable='false'
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
              aria-hidden='true'
              focusable='false'
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
