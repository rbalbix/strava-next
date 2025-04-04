import { useContext, useEffect, useState } from 'react';
import { FaMedapps } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { AuthContext } from '../contexts/AuthContext';

import { Equipment, Equipments } from '../services/equipment';
import { Modal } from './Modal';

import styles from '../styles/components/Footer.module.css';
import { copyTextToClipboard } from '../services/utils';
import { Divider } from '@mui/material';

export default function ComponentInfo() {
  const { handleCloseModal } = useContext(AuthContext);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  useEffect(() => {
    if (Equipments) setEquipment(Object.values(Equipments));
  }, []);

  return (
    <div className={styles.footerContainer}>
      <Modal id={'equipments'} closeModal={handleCloseModal}>
        <main>
          <header>
            <div>
              <div>
                <span>
                  <FaMedapps color='var(--stat-icon)' />
                </span>
                <span>Componentes:</span>
              </div>
              <div>
                <MdClose color='var(--stat-icon)' onClick={handleCloseModal} />
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
          <footer>
            <Divider className={styles.divider} style={{ margin: 'auto' }} />
          </footer>
        </main>
      </Modal>
    </div>
  );
}
