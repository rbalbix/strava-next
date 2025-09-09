import { useContext } from 'react';
import { FaMedapps } from 'react-icons/fa';
import { AuthContext } from '../contexts/AuthContext';

import { Equipments } from '../services/equipment';

import styles from '../styles/components/Footer.module.css';

type Equipment = {
  id: string;
  show: string;
};

export default function Footer() {
  const { athlete, openModal } = useContext(AuthContext);

  const equipment: Equipment[] = Object.values(Equipments);

  return (
    <div className={styles.footerContainer}>
      {athlete && (
        <div>
          <FaMedapps
            onClick={() => openModal('equipments')}
            className={styles.footerIcon}
          />
        </div>
      )}
    </div>
  );
}
