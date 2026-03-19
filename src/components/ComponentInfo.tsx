import { useContext, useEffect, useState } from 'react';
import { FaMedapps } from 'react-icons/fa';

import { Equipment, Equipments } from '../services/equipment';

import { Divider } from '@mui/material';
import { MdClose } from 'react-icons/md';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { copyTextToClipboard } from '../services/utils';
import cardStyles from '../styles/components/Card.module.css';
import styles from '../styles/components/Footer.module.css';

export default function ComponentInfo() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const { closeModal } = useContext(AuthContext);
  const { showToast } = useToast();

  useEffect(() => {
    if (Equipments) setEquipment(Object.values(Equipments));
  }, []);

  const handleCopyCode = (code: string) => {
    copyTextToClipboard(code);
    showToast(`Copiado: ${code}`, 'success');
  };

  return (
    <main className={cardStyles.athleteStatInfoContent}>
      <header>
        <div className={cardStyles.athleteStatInfoTitle}>
          <div>
            <span className={cardStyles.athleteStatInfoTitleIcon}>
              <FaMedapps color='var(--stat-icon)' />
            </span>
            <h2
              id='modal-title-equipments'
              className={cardStyles.athleteStatInfoHeading}
            >
              Componentes:
            </h2>
          </div>
          <div>
            <button
              type='button'
              onClick={closeModal}
              className={styles.closeButton}
              aria-label='Fechar componentes'
            >
              <MdClose />
            </button>
          </div>
        </div>
      </header>
      <section>
        <div className={styles.orientationRow} id='modal-desc-equipments'>
          Para controlar um componente do equipamento deve-se escrever seu
          código no campo &apos;OBSERVAÇÕES PRIVADAS&apos; e incluir um * no título da
          Atividade.
        </div>
        <div className={styles.copyHint}>Clique no código para copiar.</div>
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
                <tr key={e.id}>
                  <td>{e.show}</td>
                  <td>
                    <button
                      type='button'
                      className={styles.copyButton}
                      onClick={() => handleCopyCode(e.id)}
                      aria-label={`Copiar codigo ${e.id}`}
                    >
                      {e.id}
                    </button>
                  </td>
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
