import { useContext, useEffect, useState } from 'react';
import { FaMedapps } from 'react-icons/fa';

import { Equipment, Equipments } from '../services/equipment';

import { Divider } from '@mui/material';
import { MdClose } from 'react-icons/md';
import { AuthContext } from '../contexts/AuthContext';
import { copyTextToClipboard } from '../services/utils';
import cardStyles from '../styles/components/Card.module.css';
import styles from '../styles/components/Footer.module.css';

export default function ComponentInfo() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const { closeModal } = useContext(AuthContext);

  useEffect(() => {
    if (Equipments) setEquipment(Object.values(Equipments));
  }, []);

  return (
    <main className={cardStyles.athleteStatInfoContent}>
      <header>
        <div className={cardStyles.athleteStatInfoTitle}>
          <div>
            <span className={cardStyles.athleteStatInfoTitleIcon}>
              <FaMedapps color='var(--stat-icon)' />
            </span>
            <span>Componentes:</span>
          </div>
          <div>
            <MdClose onClick={closeModal} style={{ cursor: 'pointer' }} />
          </div>
        </div>
      </header>
      <section>
        <div className={styles.orientationRow}>
          Para controlar um componente do equipamento deve-se escrever seu
          código no campo 'OBSERVAÇÕES PRIVADAS' e incluir um * no título da
          Atividade.
        </div>
        <table className={styles.footerEquipmentTable}>
          <thead>
            <tr>
              <th>Componente</th>
              <th>Código</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map((e) => {
              return (
                <tr key={e.id} onClick={() => copyTextToClipboard(e.id)}>
                  <td>{e.show}</td>
                  <td>{e.id}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <Divider className={styles.dividerFooter} />
    </main>
  );
}
